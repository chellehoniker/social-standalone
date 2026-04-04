import { NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, serverError } from "@/lib/api/errors";

/**
 * GET /api/campaigns/drafts
 * Returns campaign posts that haven't been pushed to Late (no late_post_id).
 * These are drafts/ready posts from campaigns that were never scheduled.
 */
export async function GET(request: Request) {
  const validation = await validateTenantFromRequest(request as any);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await (supabase as any)
      .from("campaign_posts")
      .select(`
        id,
        campaign_id,
        day_number,
        caption_variants,
        media_urls,
        music_url,
        status,
        scheduled_for,
        created_at,
        updated_at,
        campaigns!inner (
          id,
          name,
          platforms,
          status
        )
      `)
      .eq("user_id", validation.user.id)
      .is("late_post_id", null)
      .in("status", ["draft", "ready", "failed"])
      .order("created_at", { ascending: false });

    if (error) return serverError(error, { action: "listCampaignDrafts" });

    // Flatten the campaign join
    const posts = (data || []).map((post: any) => ({
      ...post,
      campaign_name: post.campaigns?.name || "Unknown Campaign",
      campaign_status: post.campaigns?.status || "unknown",
      campaign_platforms: post.campaigns?.platforms || [],
      campaigns: undefined,
    }));

    return NextResponse.json({ posts });
  } catch (err) {
    return serverError(err, { action: "listCampaignDrafts" });
  }
}
