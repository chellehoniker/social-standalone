import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api/errors";

/**
 * GET /api/campaigns/[id]
 * Get a campaign with its posts.
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

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: campaign, error } = await (supabase as any)
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .eq("user_id", validation.user.id)
      .single();

    if (error || !campaign) return notFound("Campaign");

    const { data: posts } = await (supabase as any)
      .from("campaign_posts")
      .select("*")
      .eq("campaign_id", id)
      .order("day_number", { ascending: true });

    return NextResponse.json({ campaign, posts: posts || [] });
  } catch (err) {
    return serverError(err, { action: "getCampaign", campaignId: id });
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Update a campaign.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const allowedFields = ["name", "objective", "duration_days", "platforms", "status", "post_plan"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) update[field] = body[field];
    }

    const { data, error } = await (supabase as any)
      .from("campaigns")
      .update(update)
      .eq("id", id)
      .eq("user_id", validation.user.id)
      .select()
      .single();

    if (error || !data) return notFound("Campaign");

    return NextResponse.json({ campaign: data });
  } catch (err) {
    return serverError(err, { action: "updateCampaign", campaignId: id });
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign and all its posts.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    // Campaign posts cascade-delete via FK
    const { error } = await (supabase as any)
      .from("campaigns")
      .delete()
      .eq("id", id)
      .eq("user_id", validation.user.id);

    if (error) return serverError(error, { action: "deleteCampaign", campaignId: id });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, { action: "deleteCampaign", campaignId: id });
  }
}
