import { NextRequest, NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import type { Platform } from "@/lib/late-api/types";

/**
 * GET /api/late/connect/[platform]
 * Gets the OAuth connect URL for a platform
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const validation = await validateTenant();
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

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
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
