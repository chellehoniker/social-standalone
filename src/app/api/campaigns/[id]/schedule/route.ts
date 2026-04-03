import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";

/**
 * POST /api/campaigns/[id]/schedule
 * Schedule all ready campaign posts via the Late API.
 *
 * Body: {
 *   startDate: string (ISO date),
 *   timezone: string,
 *   scheduleMode: "spread" | "queue" | "custom",
 *   accountMap: { platform: accountId },
 *   postTimes?: string[] // for custom/spread: "HH:mm" times to cycle through
 * }
 *
 * "spread" = one post per day starting at startDate, cycling through postTimes
 * "queue" = use the user's Late queue (queuedFromProfile)
 * "custom" = same as spread but user provides specific times
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
  const { profileId } = validation;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { startDate, timezone, scheduleMode, accountMap, postTimes } = body;
  if (!startDate || !accountMap) {
    return badRequest("startDate and accountMap are required");
  }

  try {
    const supabase = createServiceClient();

    const { data: campaign } = await (supabase as any)
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", validation.user.id)
      .single();

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    // Check for posts still generating media — refuse to schedule partially
    const { data: allCampaignPosts } = await (supabase as any)
      .from("campaign_posts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("day_number");

    const generating = (allCampaignPosts || []).filter((p: any) => p.status === "generating");
    if (generating.length > 0) {
      return badRequest(
        `${generating.length} post(s) are still generating media. Wait for media generation to complete before scheduling.`
      );
    }

    // Pick up draft, ready, and failed posts that haven't been scheduled yet (allows retries)
    const posts = (allCampaignPosts || []).filter(
      (p: any) => !p.late_post_id && ["draft", "ready", "failed"].includes(p.status)
    );

    if (!posts?.length) return badRequest("No posts to schedule");

    const plan = campaign.post_plan || [];
    const late = await getLateClient();
    const start = new Date(startDate);
    const times = postTimes?.length ? postTimes : ["10:00"];
    let scheduled = 0;
    let failed = 0;

    for (const post of posts) {
      const dayPlan = plan.find((d: any) => d.day === post.day_number);
      if (!dayPlan) continue;

      // Build platforms array from accountMap with per-platform captions
      const platforms = Object.entries(accountMap)
        .filter(([platform]) => post.caption_variants[platform])
        .map(([platform, accountId]) => ({
          platform,
          accountId,
          customContent: post.caption_variants[platform] || undefined,
        }));

      if (platforms.length === 0) continue;

      // Build mediaItems based on content type
      const mediaItems: Array<{ type: "image" | "video"; url: string }> = [];
      const mediaUrls = post.media_urls || {};

      if (dayPlan.contentType === "carousel") {
        // Carousel: multiple images as slides
        const slideKeys = Object.keys(mediaUrls)
          .filter((k) => k.startsWith("slide_"))
          .sort((a, b) => parseInt(a.replace("slide_", "")) - parseInt(b.replace("slide_", "")));
        for (const key of slideKeys) {
          if (mediaUrls[key]) {
            mediaItems.push({ type: "image", url: mediaUrls[key] });
          }
        }
      } else if (dayPlan.contentType === "video") {
        // Video: use the generated video, fallback to still
        if (mediaUrls.video) {
          mediaItems.push({ type: "video", url: mediaUrls.video });
        } else if (mediaUrls.video_still) {
          mediaItems.push({ type: "image", url: mediaUrls.video_still });
        }
      } else {
        // Single image: use the first available URL
        const firstUrl = Object.values(mediaUrls).find(Boolean) as string;
        if (firstUrl) {
          mediaItems.push({ type: "image", url: firstUrl });
        }
      }

      // Build create post body
      const defaultCaption = post.caption_variants[platforms[0].platform] || dayPlan.theme;
      const createBody: Record<string, unknown> = {
        content: defaultCaption,
        platforms,
        timezone: timezone || "UTC",
        profileId,
      };

      if (mediaItems.length > 0) {
        createBody.mediaItems = mediaItems;
      }

      if (scheduleMode === "queue") {
        // Queue mode: Late assigns to next available queue slot
        createBody.queuedFromProfile = profileId;
      } else {
        // Spread/custom: calculate specific scheduled time
        const postDate = new Date(start);
        postDate.setDate(postDate.getDate() + (post.day_number - 1));
        const timeIndex = (post.day_number - 1) % times.length;
        const [hours, minutes] = (times[timeIndex] || "10:00").split(":").map(Number);
        postDate.setHours(hours, minutes, 0, 0);
        createBody.scheduledFor = postDate.toISOString();
        createBody.publishNow = false;
      }

      try {
        const { data: latePost } = await late.posts.createPost({
          body: createBody as any,
        });

        if (latePost) {
          await (supabase as any)
            .from("campaign_posts")
            .update({
              late_post_id: latePost.post?._id || null,
              scheduled_for: scheduleMode === "queue" ? null : (createBody.scheduledFor as string),
              status: "scheduled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", post.id);
          scheduled++;
        } else {
          await (supabase as any)
            .from("campaign_posts")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", post.id);
          failed++;
        }
      } catch (err) {
        await (supabase as any)
          .from("campaign_posts")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", post.id);
        failed++;
        console.error(`[Campaign] Error scheduling day ${post.day_number}:`, err);
      }
    }

    await (supabase as any)
      .from("campaigns")
      .update({
        status: failed === 0 ? "scheduled" : "review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return NextResponse.json({ scheduled, failed, total: posts.length });
  } catch (err) {
    return serverError(err, { action: "scheduleCampaign", campaignId });
  }
}
