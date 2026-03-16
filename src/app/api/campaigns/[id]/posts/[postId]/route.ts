import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api/errors";

/**
 * PATCH /api/campaigns/[id]/posts/[postId]
 * Update a single campaign post (captions, media, status).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id: campaignId, postId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const allowedFields = ["caption_variants", "media_urls", "music_url", "status", "scheduled_for"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) update[field] = body[field];
    }

    const { data, error } = await (supabase as any)
      .from("campaign_posts")
      .update(update)
      .eq("id", postId)
      .eq("campaign_id", campaignId)
      .eq("user_id", validation.user.id)
      .select()
      .single();

    if (error || !data) return notFound("Campaign post");

    return NextResponse.json({ post: data });
  } catch (err) {
    return serverError(err, { action: "updateCampaignPost", campaignId, postId });
  }
}
