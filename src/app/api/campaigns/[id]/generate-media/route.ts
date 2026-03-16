import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { generateImage, generateVideo, generateMusic } from "@/lib/freepik/client";
import { PLATFORM_IMAGE_SIZES, getDefaultSizeKey } from "@/lib/ai/platform-sizes";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";

const MAX_CONCURRENT = 2;

/**
 * POST /api/campaigns/[id]/generate-media
 * Generate all media (images, carousels, videos, music) for campaign posts.
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

    const freepikKey = decrypt(settings.freepik_key_encrypted);
    const imageModel = settings.freepik_image_model || "nano-banana-pro";
    const videoModel = settings.freepik_video_model || "kling-o1-pro";
    const stylePrompt = settings.image_style_prompt || "";

    const platforms = (campaign.platforms || []).map((p: any) =>
      typeof p === "string" ? p : p.platform
    );

    // Compute unique sizes needed across platforms
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
    // Use the first (most common) size as default for video first frames
    const defaultSize = uniqueSizes.values().next().value || { width: 1080, height: 1350 };

    let totalTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;

    // Process posts with limited concurrency
    const postQueue = [...posts];
    const activeWork = new Set<Promise<void>>();

    const processPost = async (post: any) => {
      const dayPlan = plan.find((d: any) => d.day === post.day_number);
      if (!dayPlan?.imagePrompt) {
        failedTasks++;
        return;
      }

      const appendStyle = (prompt: string) =>
        stylePrompt ? `${prompt}. Style: ${stylePrompt}` : prompt;

      const mediaUrls: Record<string, string> = {};
      let musicUrl: string | null = null;
      let hasFailure = false;

      // Mark post as generating
      await (supabase as any)
        .from("campaign_posts")
        .update({ status: "generating", updated_at: new Date().toISOString() })
        .eq("id", post.id);

      try {
        if (dayPlan.contentType === "carousel") {
          // ── CAROUSEL: Generate multiple images (one per slide) ──
          const slidePrompts = dayPlan.imagePrompts?.length
            ? dayPlan.imagePrompts
            : [dayPlan.imagePrompt]; // fallback to single image

          const slideUrls: string[] = [];
          for (let i = 0; i < slidePrompts.length; i++) {
            totalTasks++;
            try {
              const result = await generateImage(
                freepikKey,
                imageModel,
                appendStyle(slidePrompts[i]),
                defaultSize.width,
                defaultSize.height
              );
              if (result.status === "completed" && result.resultUrl) {
                slideUrls.push(result.resultUrl);
                completedTasks++;
              } else {
                hasFailure = true;
                failedTasks++;
              }
            } catch (err) {
              console.error(`[Media] Carousel slide ${i} failed for day ${post.day_number}:`, err);
              hasFailure = true;
              failedTasks++;
            }
          }
          // Store slide URLs indexed by slide number
          slideUrls.forEach((url, i) => {
            mediaUrls[`slide_${i}`] = url;
          });

        } else if (dayPlan.contentType === "video") {
          // ── VIDEO: Generate still image → video from it → optional music ──

          // Step 1: Generate the hero still image (used as video first frame)
          totalTasks++;
          let stillUrl: string | null = null;
          try {
            const stillResult = await generateImage(
              freepikKey,
              imageModel,
              appendStyle(dayPlan.imagePrompt),
              defaultSize.width,
              defaultSize.height
            );
            if (stillResult.status === "completed" && stillResult.resultUrl) {
              stillUrl = stillResult.resultUrl;
              mediaUrls["video_still"] = stillUrl;
              completedTasks++;
            } else {
              hasFailure = true;
              failedTasks++;
            }
          } catch (err) {
            console.error(`[Media] Video still failed for day ${post.day_number}:`, err);
            hasFailure = true;
            failedTasks++;
          }

          // Step 2: Generate video from still image
          if (stillUrl) {
            totalTasks++;
            try {
              const videoPrompt = dayPlan.videoPrompt || `Gentle camera movement, ${dayPlan.theme}`;
              const videoResult = await generateVideo(
                freepikKey,
                videoModel,
                videoPrompt,
                stillUrl
              );
              if (videoResult.status === "completed" && videoResult.resultUrl) {
                mediaUrls["video"] = videoResult.resultUrl;
                completedTasks++;
              } else {
                hasFailure = true;
                failedTasks++;
              }
            } catch (err) {
              console.error(`[Media] Video gen failed for day ${post.day_number}:`, err);
              hasFailure = true;
              failedTasks++;
            }
          }

          // Step 3: Generate music (if music prompt provided)
          if (dayPlan.musicPrompt) {
            totalTasks++;
            try {
              const musicResult = await generateMusic(
                freepikKey,
                dayPlan.musicPrompt,
                15
              );
              if (musicResult.status === "completed" && musicResult.resultUrl) {
                musicUrl = musicResult.resultUrl;
                completedTasks++;
              } else {
                failedTasks++;
                // Music failure is non-fatal
              }
            } catch (err) {
              console.error(`[Media] Music gen failed for day ${post.day_number}:`, err);
              failedTasks++;
            }
          }

        } else {
          // ── SINGLE IMAGE: One image per unique platform size ──
          const seenGroups = new Set<string>();
          for (const [groupKey, size] of uniqueSizes) {
            if (seenGroups.has(groupKey)) continue;
            seenGroups.add(groupKey);

            totalTasks++;
            try {
              const result = await generateImage(
                freepikKey,
                imageModel,
                appendStyle(dayPlan.imagePrompt),
                size.width,
                size.height
              );
              if (result.status === "completed" && result.resultUrl) {
                mediaUrls[groupKey] = result.resultUrl;
                completedTasks++;
              } else {
                hasFailure = true;
                failedTasks++;
              }
            } catch (err) {
              console.error(`[Media] Image ${groupKey} failed for day ${post.day_number}:`, err);
              hasFailure = true;
              failedTasks++;
            }
          }
        }
      } catch (err) {
        console.error(`[Media] Unexpected error for day ${post.day_number}:`, err);
        hasFailure = true;
      }

      // Update post with generated media
      const hasMedia = Object.keys(mediaUrls).length > 0 || musicUrl;
      await (supabase as any)
        .from("campaign_posts")
        .update({
          media_urls: mediaUrls,
          music_url: musicUrl,
          status: hasMedia ? "ready" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
    };

    // Run with concurrency limit
    const runNext = async () => {
      while (postQueue.length > 0) {
        const post = postQueue.shift()!;
        await processPost(post);
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < MAX_CONCURRENT; i++) {
      workers.push(runNext());
    }
    await Promise.all(workers);

    return NextResponse.json({
      total: totalTasks,
      completed: completedTasks,
      failed: failedTasks,
    });
  } catch (err) {
    return serverError(err, { action: "generateMedia", campaignId });
  }
}

/**
 * GET /api/campaigns/[id]/generate-media
 * Check media generation status.
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
    return NextResponse.json({
      total: allPosts.length,
      completed: allPosts.filter((p: any) => p.status === "ready" || p.status === "scheduled").length,
      failed: allPosts.filter((p: any) => p.status === "failed").length,
      inProgress: allPosts.filter((p: any) => p.status === "generating").length,
      posts: allPosts,
    });
  } catch (err) {
    return serverError(err, { action: "getMediaStatus", campaignId });
  }
}
