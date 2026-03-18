import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { generateImage, generateVideo, generateMusic } from "@/lib/freepik/client";
import { PLATFORM_IMAGE_SIZES, getDefaultSizeKey } from "@/lib/ai/platform-sizes";
import { unauthorized, forbidden, rateLimited, badRequest, notFound, serverError } from "@/lib/api/errors";

const activeJobs = new Map<string, boolean>();

/**
 * POST /api/v1/campaigns/[id]/generate-media
 * Kick off media generation (background). Poll GET for status.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "generateMedia" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) return rateLimited(`Rate limit exceeded`);

  const { id: campaignId } = await params;
  const userId = validation.profile.id;

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

    if (!campaignResult.data) return notFound("Campaign");
    if (!settingsResult.data?.freepik_key_encrypted) return badRequest("FreePik API key not configured in settings");

    const campaign = campaignResult.data;
    const settings = settingsResult.data;
    const posts = (postsResult.data || []).filter((p: any) => p.status === "draft" || p.status === "failed");
    const plan = campaign.post_plan || [];

    for (const post of posts) {
      await (supabase as any).from("campaign_posts").update({ status: "generating", updated_at: new Date().toISOString() }).eq("id", post.id);
    }

    activeJobs.set(campaignId, true);

    // Background processing (same logic as internal route)
    (async () => {
      const freepikKey = decrypt(settings.freepik_key_encrypted);
      const imageModel = settings.freepik_image_model || "nano-banana-pro";
      const videoModel = settings.freepik_video_model || "kling-o1-pro";
      const stylePrompt = settings.image_style_prompt || "";
      const platforms = (campaign.platforms || []).map((p: any) => typeof p === "string" ? p : p.platform);

      const uniqueSizes = new Map<string, { width: number; height: number }>();
      for (const platform of platforms) {
        const sizeKey = getDefaultSizeKey(platform);
        const size = PLATFORM_IMAGE_SIZES[sizeKey];
        if (size) uniqueSizes.set(`${size.width}x${size.height}`, { width: size.width, height: size.height });
      }
      const defaultSize = uniqueSizes.values().next().value || { width: 1080, height: 1350 };
      const appendStyle = (prompt: string) => stylePrompt ? `${prompt}. Style: ${stylePrompt}` : prompt;

      for (const post of posts) {
        const dayPlan = plan.find((d: any) => d.day === post.day_number);
        if (!dayPlan?.imagePrompt) {
          await (supabase as any).from("campaign_posts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", post.id);
          continue;
        }

        const mediaUrls: Record<string, string> = {};
        let musicUrl: string | null = null;

        try {
          if (dayPlan.contentType === "carousel") {
            const slidePrompts = dayPlan.imagePrompts?.length ? dayPlan.imagePrompts : [dayPlan.imagePrompt];
            for (let i = 0; i < slidePrompts.length; i++) {
              try {
                const result = await generateImage(freepikKey, imageModel, appendStyle(slidePrompts[i]), defaultSize.width, defaultSize.height);
                if (result.status === "completed" && result.resultUrl) mediaUrls[`slide_${i}`] = result.resultUrl;
              } catch (err) { console.error(`[Media v1] Slide ${i} day ${post.day_number}:`, err); }
            }
          } else if (dayPlan.contentType === "video") {
            try {
              const stillResult = await generateImage(freepikKey, imageModel, appendStyle(dayPlan.imagePrompt), defaultSize.width, defaultSize.height);
              if (stillResult.status === "completed" && stillResult.resultUrl) {
                mediaUrls["video_still"] = stillResult.resultUrl;
                try {
                  const videoResult = await generateVideo(freepikKey, videoModel, dayPlan.videoPrompt || "Gentle camera movement", stillResult.resultUrl);
                  if (videoResult.status === "completed" && videoResult.resultUrl) mediaUrls["video"] = videoResult.resultUrl;
                } catch (err) { console.error(`[Media v1] Video day ${post.day_number}:`, err); }
              }
            } catch (err) { console.error(`[Media v1] Still day ${post.day_number}:`, err); }
            if (dayPlan.musicPrompt) {
              try {
                const musicResult = await generateMusic(freepikKey, dayPlan.musicPrompt, 15);
                if (musicResult.status === "completed" && musicResult.resultUrl) musicUrl = musicResult.resultUrl;
              } catch (err) { console.error(`[Media v1] Music day ${post.day_number}:`, err); }
            }
          } else {
            for (const [groupKey, size] of uniqueSizes) {
              try {
                const result = await generateImage(freepikKey, imageModel, appendStyle(dayPlan.imagePrompt), size.width, size.height);
                if (result.status === "completed" && result.resultUrl) mediaUrls[groupKey] = result.resultUrl;
              } catch (err) { console.error(`[Media v1] Image ${groupKey} day ${post.day_number}:`, err); }
            }
          }
        } catch (err) { console.error(`[Media v1] Day ${post.day_number}:`, err); }

        await (supabase as any).from("campaign_posts").update({
          media_urls: mediaUrls,
          music_url: musicUrl,
          status: Object.keys(mediaUrls).length > 0 || musicUrl ? "ready" : "failed",
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);
      }
    })().finally(() => activeJobs.delete(campaignId));

    return NextResponse.json({ status: "started", total: posts.length });
  } catch (err) {
    return serverError(err, { action: "generateMedia", campaignId });
  }
}

/**
 * GET /api/v1/campaigns/[id]/generate-media
 * Poll media generation status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "mediaStatus" });
  }

  const { id: campaignId } = await params;

  try {
    const supabase = createServiceClient();
    const { data: posts } = await (supabase as any)
      .from("campaign_posts")
      .select("id, day_number, status, media_urls, music_url")
      .eq("campaign_id", campaignId)
      .eq("user_id", validation.profile.id)
      .order("day_number");

    const allPosts = posts || [];
    return NextResponse.json({
      total: allPosts.length,
      completed: allPosts.filter((p: any) => p.status === "ready" || p.status === "scheduled").length,
      failed: allPosts.filter((p: any) => p.status === "failed").length,
      inProgress: allPosts.filter((p: any) => p.status === "generating").length,
      isRunning: activeJobs.has(campaignId),
      posts: allPosts,
    });
  } catch (err) {
    return serverError(err, { action: "mediaStatus", campaignId });
  }
}
