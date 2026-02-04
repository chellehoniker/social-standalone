import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, notFound, badGateway } from "@/lib/api/errors";
import { lateGuards } from "@/lib/type-guards";

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
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { id } = await params;

  const late = await getLateClient();

  // First verify this account belongs to the tenant's profile
  const { data: accounts } = await late.accounts.listAccounts({
    query: { profileId: validation.profileId },
  });

  const accountBelongsToTenant = accounts?.accounts?.some(
    (acc: unknown) => lateGuards.isAccount(acc) && acc._id === id
  );

  if (!accountBelongsToTenant) {
    return notFound("Account");
  }

  const { error } = await late.accounts.deleteAccount({
    path: { accountId: id },
  });

  if (error) {
    return badGateway("Late API", error);
  }

  return NextResponse.json({ success: true });
}
