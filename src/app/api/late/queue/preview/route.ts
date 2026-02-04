import { NextRequest, NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

/**
 * GET /api/late/queue/preview
 * Returns upcoming queue slots preview
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;
  const count = searchParams.get("count")
    ? parseInt(searchParams.get("count")!)
    : 10;

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
  const { data, error } = await late.queue.previewQueue({
    query: {
      profileId,
      count,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch queue preview" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
