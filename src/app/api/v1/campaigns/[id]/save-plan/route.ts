import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, rateLimited, badRequest, notFound, serverError } from "@/lib/api/errors";

/**
 * POST /api/v1/campaigns/[id]/save-plan
 * Save a Claude-generated campaign plan.
 * Body: { plan: CampaignDay[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "savePlan" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) return rateLimited(`Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`);

  const { id: campaignId } = await params;

  let body;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON"); }

  const { plan } = body;
  if (!Array.isArray(plan) || plan.length === 0) return badRequest("plan must be a non-empty array");

  try {
    const supabase = createServiceClient();

    // Verify campaign belongs to user
    const { data: campaign, error: campError } = await (supabase as any)
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", validation.profile.id)
      .single();

    if (campError || !campaign) return notFound("Campaign");

    // Save plan to campaign
    await (supabase as any)
      .from("campaigns")
      .update({
        post_plan: plan,
        status: "review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Delete existing posts and create new ones
    await (supabase as any)
      .from("campaign_posts")
      .delete()
      .eq("campaign_id", campaignId);

    const posts = plan.map((day: any) => ({
      campaign_id: campaignId,
      user_id: validation.profile.id,
      day_number: day.day,
      caption_variants: day.captions || {},
      media_urls: {},
      status: "draft",
    }));

    if (posts.length > 0) {
      await (supabase as any)
        .from("campaign_posts")
        .insert(posts);
    }

    return NextResponse.json({ success: true, postCount: posts.length });
  } catch (err) {
    return serverError(err, { action: "savePlan", campaignId });
  }
}
