import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api/errors";

/**
 * POST /api/campaigns/[id]/schedule
 * Schedule all ready campaign posts via the Late API.
 * Body: { startDate, timezone, useQueue?, accountMap }
 * accountMap: { platform: accountId } - maps platform names to Late account IDs
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

  const { startDate, timezone, useQueue, accountMap } = body;
  if (!startDate || !accountMap) {
    return badRequest("startDate and accountMap are required");
  }

  try {
    const supabase = createServiceClient();

    // Get campaign + posts
    const { data: campaign } = await (supabase as any)
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", validation.user.id)
      .single();

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const { data: posts } = await (supabase as any)
      .from("campaign_posts")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("status", ["draft", "ready"])
      .order("day_number");

    if (!posts?.length) return badRequest("No posts to schedule");

    const plan = campaign.post_plan || [];
    const late = await getLateClient();
    const start = new Date(startDate);
    let scheduled = 0;
    let failed = 0;

    for (const post of posts) {
      const dayPlan = plan.find((d: any) => d.day === post.day_number);
      if (!dayPlan) continue;

      // Calculate scheduled time (one post per day, starting from startDate)
      const postDate = new Date(start);
      postDate.setDate(postDate.getDate() + (post.day_number - 1));
      // Default to 10:00 AM if not using queue
      postDate.setHours(10, 0, 0, 0);

      // Build platforms array from accountMap
      const platforms = Object.entries(accountMap)
        .filter(([platform]) => post.caption_variants[platform])
        .map(([platform, accountId]) => ({
          platform,
          accountId,
          customContent: post.caption_variants[platform] || undefined,
        }));

      if (platforms.length === 0) continue;

      // Find the first available media URL
      const mediaUrls = post.media_urls || {};
      const mediaItems = Object.values(mediaUrls)
        .filter(Boolean)
        .slice(0, 1) // Use first available image
        .map((url) => ({
          type: "image" as const,
          url: url as string,
        }));

      try {
        const createBody: Record<string, unknown> = {
          content: post.caption_variants[platforms[0].platform] || dayPlan.theme,
          platforms,
          timezone: timezone || "UTC",
          profileId,
        };

        if (useQueue) {
          createBody.queuedFromProfile = profileId;
        } else {
          createBody.scheduledFor = postDate.toISOString();
          createBody.publishNow = false;
        }

        if (mediaItems.length > 0) {
          createBody.mediaItems = mediaItems;
        }

        const { data: latePost, error: lateError } = await late.posts.createPost({
          body: createBody as any,
        });

        if (latePost) {
          await (supabase as any)
            .from("campaign_posts")
            .update({
              late_post_id: latePost.post?._id || null,
              scheduled_for: postDate.toISOString(),
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
          console.error(`[Campaign] Failed to schedule day ${post.day_number}:`, lateError);
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

    // Update campaign status
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
