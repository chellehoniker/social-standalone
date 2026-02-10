import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badGateway } from "@/lib/api/errors";
import { jsonWithCache, CacheDuration } from "@/lib/api/cache";

/**
 * GET /api/late/accounts
 * Returns all accounts for the tenant's profile (supports multi-profile via X-Profile-Id header)
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const late = await getLateClient();
  const { data, error } = await late.accounts.listAccounts({
    query: { profileId },
  });

  if (error) {
    return badGateway("Late API", error);
  }

  return jsonWithCache(data, CacheDuration.SHORT);
}
