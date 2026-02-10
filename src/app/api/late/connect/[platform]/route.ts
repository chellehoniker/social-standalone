import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import type { Platform } from "@/lib/late-api/types";

/**
 * GET /api/late/connect/[platform]
 * Gets the OAuth connect URL for a platform
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const { platform } = await params;
  const searchParams = request.nextUrl.searchParams;
  const redirectUrl = searchParams.get("redirect_url") ||
    `${process.env.NEXT_PUBLIC_APP_URL}/callback`;

  const late = await getLateClient();
  const { data, error } = await late.connect.getConnectUrl({
    path: { platform: platform as Platform },
    query: {
      profileId,
      redirect_url: redirectUrl,
      headless: true,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to get connect URL" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
