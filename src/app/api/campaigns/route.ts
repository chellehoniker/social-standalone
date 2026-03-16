import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, serverError } from "@/lib/api/errors";

/**
 * GET /api/campaigns
 * List user's campaigns.
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("campaigns")
      .select("id, name, objective, duration_days, platforms, status, created_at, updated_at")
      .eq("user_id", validation.user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError(error, { action: "listCampaigns" });

    return NextResponse.json({ campaigns: data });
  } catch (err) {
    return serverError(err, { action: "listCampaigns" });
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign.
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, objective, duration_days, platforms } = body;
  if (!name || !objective) {
    return NextResponse.json({ error: "Name and objective are required" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("campaigns")
      .insert({
        user_id: validation.user.id,
        name,
        objective,
        duration_days: duration_days || 30,
        platforms: platforms || [],
        status: "draft",
      })
      .select()
      .single();

    if (error) return serverError(error, { action: "createCampaign" });

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (err) {
    return serverError(err, { action: "createCampaign" });
  }
}
