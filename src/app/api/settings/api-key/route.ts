import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/auth/api-keys";
import { unauthorized, forbidden, conflict, serverError } from "@/lib/api/errors";
import type { ProfileUpdate } from "@/lib/supabase/types";

/**
 * GET /api/settings/api-key
 * Check if the user has an active API key.
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { profile } = validation;

  return NextResponse.json({
    hasApiKey: !!profile.api_key_hash,
    createdAt: profile.api_key_created_at,
  });
}

/**
 * POST /api/settings/api-key
 * Generate a new API key. Returns the plaintext key once.
 * Returns 409 if a key already exists (must revoke first).
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { profile } = validation;

  if (profile.api_key_hash) {
    return conflict("API key already exists. Revoke the existing key first.");
  }

  const { key, hash } = generateApiKey();

  try {
    const supabase = createServiceClient();
    const { error: updateError } = await (supabase
      .from("profiles") as any)
      .update({
        api_key_hash: hash,
        api_key_created_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) {
      return serverError(updateError, { action: "generateApiKey" });
    }

    return NextResponse.json({
      key,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return serverError(err, { action: "generateApiKey" });
  }
}

/**
 * DELETE /api/settings/api-key
 * Revoke the user's API key.
 */
export async function DELETE(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { profile } = validation;

  try {
    const supabase = createServiceClient();
    const { error: updateError } = await (supabase
      .from("profiles") as any)
      .update({
        api_key_hash: null,
        api_key_created_at: null,
      })
      .eq("id", profile.id);

    if (updateError) {
      return serverError(updateError, { action: "revokeApiKey" });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, { action: "revokeApiKey" });
  }
}
