import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { processGenerationQueue, type GenerationTask } from "@/lib/freepik";
import { PLATFORM_IMAGE_SIZES, getDefaultSizeKey, getDeduplicationGroups } from "@/lib/ai/platform-sizes";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";

/**
 * POST /api/campaigns/[id]/generate-media
 * Generate images/videos for all campaign posts via FreePik.
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

    // Get campaign + settings
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
    const imageModel = settings.freepik_image_model || "mystic";
    const videoModel = settings.freepik_video_model || "kling-o1-pro";

    // Build generation tasks
    const tasks: GenerationTask[] = [];
    const platforms = (campaign.platforms || []).map((p: any) =>
      typeof p === "string" ? p : p.platform
    );

    // Compute deduplication groups
    const sizeKeys = platforms.map((p: string) => getDefaultSizeKey(p));
    const dedupeGroups = getDeduplicationGroups(sizeKeys);

    for (const post of posts) {
      const dayPlan = plan.find((d: any) => d.day === post.day_number);
      if (!dayPlan?.imagePrompt) continue;

      const fullPrompt = settings.image_style_prompt
        ? `${dayPlan.imagePrompt}. Style: ${settings.image_style_prompt}`
        : dayPlan.imagePrompt;

      if (dayPlan.contentType === "video") {
        // For video: generate a still image first, then video from it
        const size = PLATFORM_IMAGE_SIZES[getDefaultSizeKey(platforms[0])] || PLATFORM_IMAGE_SIZES.twitter;
        tasks.push({
          id: `${post.id}_video_still`,
          type: "image",
          prompt: fullPrompt,
          width: size.width,
          height: size.height,
          model: imageModel,
        });
        // Video task added after image is done (handled in post-processing)
      } else {
        // For image posts: one task per unique size group
        const seenGroups = new Set<string>();
        for (const platform of platforms) {
          const sizeKey = getDefaultSizeKey(platform);
          const size = PLATFORM_IMAGE_SIZES[sizeKey];
          if (!size) continue;

          const groupKey = `${size.width}x${size.height}`;
          if (seenGroups.has(groupKey)) continue;
          seenGroups.add(groupKey);

          tasks.push({
            id: `${post.id}_${sizeKey}`,
            type: "image",
            prompt: fullPrompt,
            width: size.width,
            height: size.height,
            model: imageModel,
            deduplicationKey: `day${post.day_number}_${groupKey}`,
          });
        }
      }
    }

    // Process the queue
    const results = await processGenerationQueue(freepikKey, tasks);

    // Update campaign_posts with generated media URLs
    let successCount = 0;
    let failCount = 0;

    for (const post of posts) {
      const mediaUrls: Record<string, string> = {};
      let hasFailure = false;

      for (const [taskId, result] of results) {
        if (!taskId.startsWith(post.id)) continue;

        if (result.status === "completed" && result.resultUrl) {
          const sizeKey = taskId.replace(`${post.id}_`, "");
          mediaUrls[sizeKey] = result.resultUrl;
        } else {
          hasFailure = true;
        }
      }

      const hasMedia = Object.keys(mediaUrls).length > 0;

      await (supabase as any)
        .from("campaign_posts")
        .update({
          media_urls: mediaUrls,
          status: hasMedia ? (hasFailure ? "ready" : "ready") : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (hasMedia) successCount++;
      else if (hasFailure) failCount++;
    }

    return NextResponse.json({
      total: tasks.length,
      completed: successCount,
      failed: failCount,
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
      .select("id, day_number, status, media_urls")
      .eq("campaign_id", campaignId)
      .eq("user_id", validation.user.id)
      .order("day_number");

    const allPosts = posts || [];
    const total = allPosts.length;
    const completed = allPosts.filter((p: any) => p.status === "ready" || p.status === "scheduled").length;
    const failed = allPosts.filter((p: any) => p.status === "failed").length;
    const generating = allPosts.filter((p: any) => p.status === "generating").length;

    return NextResponse.json({
      total,
      completed,
      failed,
      inProgress: generating,
      posts: allPosts,
    });
  } catch (err) {
    return serverError(err, { action: "getMediaStatus", campaignId });
  }
}
