import { NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

const late = new Late({ apiKey: process.env.LATE_API_KEY! });

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
