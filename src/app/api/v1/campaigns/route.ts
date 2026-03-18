import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, rateLimited, badRequest, serverError } from "@/lib/api/errors";

/**
 * GET /api/v1/campaigns
 * List user's campaigns.
 */
export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "listCampaigns" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) return rateLimited(`Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`);

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("campaigns")
      .select("id, name, objective, duration_days, platforms, status, content_mix, created_at, updated_at")
      .eq("user_id", validation.profile.id)
      .order("created_at", { ascending: false });

    if (error) return serverError(error, { action: "listCampaigns" });
    return NextResponse.json({ campaigns: data });
  } catch (err) {
    return serverError(err, { action: "listCampaigns" });
  }
}

/**
 * POST /api/v1/campaigns
 * Create a new campaign.
 */
export async function POST(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "createCampaign" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) return rateLimited(`Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`);

  let body;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON"); }

  const { name, objective, duration_days, platforms, content_mix } = body;
  if (!name || !objective) return badRequest("name and objective are required");

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("campaigns")
      .insert({
        user_id: validation.profile.id,
        name,
        objective,
        duration_days: duration_days || 30,
        platforms: platforms || [],
        content_mix: content_mix || "mixed",
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
