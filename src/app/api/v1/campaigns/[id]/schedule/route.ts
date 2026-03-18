import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, rateLimited, badRequest, notFound, serverError } from "@/lib/api/errors";

/**
 * POST /api/v1/campaigns/[id]/schedule
 * Schedule all ready campaign posts via Late API.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "scheduleCampaign" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) return rateLimited(`Rate limit exceeded`);

  const { id: campaignId } = await params;
  const { profileId } = validation;

  let body;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON"); }

  const { startDate, timezone, scheduleMode, accountMap, postTimes } = body;
  if (!startDate || !accountMap) return badRequest("startDate and accountMap are required");

  try {
    const supabase = createServiceClient();

    const { data: campaign } = await (supabase as any)
      .from("campaigns").select("*").eq("id", campaignId).eq("user_id", validation.profile.id).single();
    if (!campaign) return notFound("Campaign");

    const { data: posts } = await (supabase as any)
      .from("campaign_posts").select("*").eq("campaign_id", campaignId).in("status", ["draft", "ready"]).order("day_number");
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

      const platforms = Object.entries(accountMap)
        .filter(([platform]) => post.caption_variants[platform])
        .map(([platform, accountId]) => ({ platform, accountId, customContent: post.caption_variants[platform] || undefined }));
      if (platforms.length === 0) continue;

      const mediaItems: Array<{ type: "image" | "video"; url: string }> = [];
      const mediaUrls = post.media_urls || {};

      if (dayPlan.contentType === "carousel") {
        Object.keys(mediaUrls).filter(k => k.startsWith("slide_")).sort((a, b) => parseInt(a.replace("slide_", "")) - parseInt(b.replace("slide_", ""))).forEach(key => {
          if (mediaUrls[key]) mediaItems.push({ type: "image", url: mediaUrls[key] });
        });
      } else if (dayPlan.contentType === "video") {
        if (mediaUrls.video) mediaItems.push({ type: "video", url: mediaUrls.video });
        else if (mediaUrls.video_still) mediaItems.push({ type: "image", url: mediaUrls.video_still });
      } else {
        const firstUrl = Object.values(mediaUrls).find(Boolean) as string;
        if (firstUrl) mediaItems.push({ type: "image", url: firstUrl });
      }

      const createBody: Record<string, unknown> = {
        content: post.caption_variants[platforms[0].platform] || dayPlan.theme,
        platforms,
        timezone: timezone || "UTC",
        profileId,
      };
      if (mediaItems.length > 0) createBody.mediaItems = mediaItems;

      if (scheduleMode === "queue") {
        createBody.queuedFromProfile = profileId;
      } else {
        const postDate = new Date(start);
        postDate.setDate(postDate.getDate() + (post.day_number - 1));
        const timeIndex = (post.day_number - 1) % times.length;
        const [hours, minutes] = (times[timeIndex] || "10:00").split(":").map(Number);
        postDate.setHours(hours, minutes, 0, 0);
        createBody.scheduledFor = postDate.toISOString();
        createBody.publishNow = false;
      }

      try {
        const { data: latePost } = await late.posts.createPost({ body: createBody as any });
        if (latePost) {
          await (supabase as any).from("campaign_posts").update({
            late_post_id: latePost.post?._id || null,
            scheduled_for: scheduleMode === "queue" ? null : createBody.scheduledFor,
            status: "scheduled",
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
          scheduled++;
        } else { failed++; }
      } catch { failed++; }
    }

    await (supabase as any).from("campaigns").update({
      status: failed === 0 ? "scheduled" : "review",
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);

    return NextResponse.json({ scheduled, failed, total: posts.length });
  } catch (err) {
    return serverError(err, { action: "scheduleCampaign", campaignId });
  }
}
