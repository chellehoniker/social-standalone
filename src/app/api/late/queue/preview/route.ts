import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * GET /api/late/queue/preview
 * Returns upcoming queue slots preview
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
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

  try {
    const late = await getLateClient();
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
  } catch (err) {
    // SDK throws LateApiError on 404 when no queue schedule exists
    const statusCode = (err as { statusCode?: number }).statusCode || 500;
    if (statusCode === 404) {
      return NextResponse.json({ slots: [] });
    }
    console.error("[queue/preview] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch queue preview" },
      { status: statusCode }
    );
  }
}
