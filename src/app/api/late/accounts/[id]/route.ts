import { NextRequest, NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

/**
 * DELETE /api/late/accounts/[id]
 * Disconnects an account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { id } = await params;

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });

  // First verify this account belongs to the tenant's profile
  const { data: accounts } = await late.accounts.listAccounts({
    query: { profileId: validation.profileId },
  });

  const accountBelongsToTenant = accounts?.accounts?.some(
    (acc: { _id: string }) => acc._id === id
  );

  if (!accountBelongsToTenant) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404 }
    );
  }

  const { error } = await late.accounts.deleteAccount({
    path: { accountId: id },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
