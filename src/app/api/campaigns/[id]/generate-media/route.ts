import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { generateImage, generateVideo, generateMusic } from "@/lib/freepik/client";
import { PLATFORM_IMAGE_SIZES, getDefaultSizeKey } from "@/lib/ai/platform-sizes";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";

/**
 * In-memory tracking of active generation jobs.
 * Maps campaignId → true while generation is running.
 */
const activeJobs = new Map<string, boolean>();

/**
 * POST /api/campaigns/[id]/generate-media
 * Kicks off media generation in the background and returns immediately.
 * Poll GET /api/campaigns/[id]/generate-media for progress.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id: campaignId } = await params;
  const userId = validation.user.id;

  if (activeJobs.get(campaignId)) {
    return NextResponse.json({ status: "already_running" });
  }

  try {
    const supabase = createServiceClient();

    const [campaignResult, settingsResult, postsResult] = await Promise.all([
      (supabase as any).from("campaigns").select("*").eq("id", campaignId).eq("user_id", userId).single(),
      (supabase as any).from("user_ai_settings").select("*").eq("id", userId).single(),
      (supabase as any).from("campaign_posts").select("*").eq("campaign_id", campaignId).order("day_number"),
    ]);

    if (!campaignResult.data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!settingsResult.data?.freepik_key_encrypted) return badRequest("FreePik API key not configured");

    const campaign = campaignResult.data;
    const settings = settingsResult.data;
    const posts = postsResult.data || [];
    const plan = campaign.post_plan || [];

    // Only process posts that need media (draft or failed — skip ready/scheduled)
    const postsToProcess = posts.filter((p: any) => p.status === "draft" || p.status === "failed" || p.status === "generating");
    for (const post of postsToProcess) {
      await (supabase as any)
        .from("campaign_posts")
        .update({ status: "generating", updated_at: new Date().toISOString() })
        .eq("id", post.id);
    }

    // Fire-and-forget: start processing in the background
    activeJobs.set(campaignId, true);
    processMediaInBackground(
      campaignId,
      userId,
      campaign,
      settings,
      postsToProcess,
      plan
    ).finally(() => activeJobs.delete(campaignId));

    return NextResponse.json({
      status: "started",
      total: posts.length,
    });
  } catch (err) {
    return serverError(err, { action: "generateMedia", campaignId });
  }
}

/**
 * Background processor — generates media for each post sequentially,
 * updating the DB after each one so the UI can poll for progress.
 */
async function processMediaInBackground(
  campaignId: string,
  userId: string,
  campaign: any,
  settings: any,
  posts: any[],
  plan: any[]
) {
  const supabase = createServiceClient();
  const freepikKey = decrypt(settings.freepik_key_encrypted);
  const imageModel = settings.freepik_image_model || "nano-banana-pro";
  const videoModel = settings.freepik_video_model || "kling-o1-pro";
  const stylePrompt = settings.image_style_prompt || "";

  const platforms = (campaign.platforms || []).map((p: any) =>
    typeof p === "string" ? p : p.platform
  );

  // Compute unique sizes needed
  const uniqueSizes = new Map<string, { width: number; height: number }>();
  for (const platform of platforms) {
    const sizeKey = getDefaultSizeKey(platform);
    const size = PLATFORM_IMAGE_SIZES[sizeKey];
    if (size) {
      const groupKey = `${size.width}x${size.height}`;
      if (!uniqueSizes.has(groupKey)) {
        uniqueSizes.set(groupKey, { width: size.width, height: size.height });
      }
    }
  }
  const defaultSize = uniqueSizes.values().next().value || { width: 1080, height: 1350 };

  const appendStyle = (prompt: string) =>
    stylePrompt ? `${prompt}. Style: ${stylePrompt}` : prompt;

  // Process posts one at a time (sequential to avoid rate limits)
  for (const post of posts) {
    const dayPlan = plan.find((d: any) => d.day === post.day_number);
    if (!dayPlan?.imagePrompt) {
      await updatePost(supabase, post.id, { status: "failed" });
      continue;
    }

    const mediaUrls: Record<string, string> = {};
    let musicUrl: string | null = null;

    try {
      if (dayPlan.contentType === "carousel") {
        // ── CAROUSEL ──
        const slidePrompts = dayPlan.imagePrompts?.length
          ? dayPlan.imagePrompts
          : [dayPlan.imagePrompt];

        for (let i = 0; i < slidePrompts.length; i++) {
          try {
            const result = await generateImage(
              freepikKey, imageModel,
              appendStyle(slidePrompts[i]),
              defaultSize.width, defaultSize.height
            );
            if (result.status === "completed" && result.resultUrl) {
              mediaUrls[`slide_${i}`] = result.resultUrl;
            }
          } catch (err) {
            console.error(`[Media] Carousel slide ${i} day ${post.day_number}:`, err);
          }
        }

      } else if (dayPlan.contentType === "video") {
        // ── VIDEO ──
        // Step 1: Still image
        try {
          const stillResult = await generateImage(
            freepikKey, imageModel,
            appendStyle(dayPlan.imagePrompt),
            defaultSize.width, defaultSize.height
          );
          if (stillResult.status === "completed" && stillResult.resultUrl) {
            mediaUrls["video_still"] = stillResult.resultUrl;

            // Step 2: Video from still
            try {
              const videoPrompt = dayPlan.videoPrompt || `Gentle camera movement, ${dayPlan.theme}`;
              const videoResult = await generateVideo(
                freepikKey, videoModel, videoPrompt, stillResult.resultUrl
              );
              if (videoResult.status === "completed" && videoResult.resultUrl) {
                mediaUrls["video"] = videoResult.resultUrl;
              }
            } catch (err) {
              console.error(`[Media] Video gen day ${post.day_number}:`, err);
            }
          }
        } catch (err) {
          console.error(`[Media] Video still day ${post.day_number}:`, err);
        }

        // Step 3: Music
        if (dayPlan.musicPrompt) {
          try {
            const musicResult = await generateMusic(freepikKey, dayPlan.musicPrompt, 15);
            if (musicResult.status === "completed" && musicResult.resultUrl) {
              musicUrl = musicResult.resultUrl;
            }
          } catch (err) {
            console.error(`[Media] Music day ${post.day_number}:`, err);
          }
        }

      } else {
        // ── SINGLE IMAGE ──
        const seenGroups = new Set<string>();
        for (const [groupKey, size] of uniqueSizes) {
          if (seenGroups.has(groupKey)) continue;
          seenGroups.add(groupKey);

          try {
            const result = await generateImage(
              freepikKey, imageModel,
              appendStyle(dayPlan.imagePrompt),
              size.width, size.height
            );
            if (result.status === "completed" && result.resultUrl) {
              mediaUrls[groupKey] = result.resultUrl;
            }
          } catch (err) {
            console.error(`[Media] Image ${groupKey} day ${post.day_number}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`[Media] Unexpected error day ${post.day_number}:`, err);
    }

    // Update this post immediately so the UI sees progress
    const hasMedia = Object.keys(mediaUrls).length > 0 || musicUrl;
    await updatePost(supabase, post.id, {
      media_urls: mediaUrls,
      music_url: musicUrl,
      status: hasMedia ? "ready" : "failed",
    });
  }
}

async function updatePost(supabase: any, postId: string, data: Record<string, unknown>) {
  await supabase
    .from("campaign_posts")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", postId);
}

/**
 * GET /api/campaigns/[id]/generate-media
 * Poll for media generation progress.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id: campaignId } = await params;

  try {
    const supabase = createServiceClient();
    const { data: posts } = await (supabase as any)
      .from("campaign_posts")
      .select("id, day_number, status, media_urls, music_url")
      .eq("campaign_id", campaignId)
      .eq("user_id", validation.user.id)
      .order("day_number");

    const allPosts = posts || [];
    const completed = allPosts.filter((p: any) => p.status === "ready" || p.status === "scheduled").length;
    const failed = allPosts.filter((p: any) => p.status === "failed").length;
    const generating = allPosts.filter((p: any) => p.status === "generating").length;
    const isRunning = activeJobs.has(campaignId);

    return NextResponse.json({
      total: allPosts.length,
      completed,
      failed,
      inProgress: generating,
      isRunning,
      posts: allPosts,
    });
  } catch (err) {
    return serverError(err, { action: "getMediaStatus", campaignId });
  }
}
