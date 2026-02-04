import { NextRequest, NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

/**
 * POST /api/late/media/presign
 * Gets a presigned URL for media upload
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const body = await request.json();

  if (!body.filename || !body.contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
  const { data, error } = await late.media.getMediaPresignedUrl({
    body: {
      filename: body.filename,
      contentType: body.contentType,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to get presigned URL" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
