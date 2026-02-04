import { NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * GET /api/late/accounts/health
 * Returns health status for all accounts in the tenant's profile
 */
export async function GET() {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const late = await getLateClient();
  const { data, error } = await late.accounts.getAllAccountsHealth({
    query: { profileId },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch account health" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
