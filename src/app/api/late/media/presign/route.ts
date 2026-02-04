import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badGateway } from "@/lib/api/errors";
import { parseRequestBody, PresignRequestSchema } from "@/lib/validations";

/**
 * POST /api/late/media/presign
 * Gets a presigned URL for media upload
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const parsed = await parseRequestBody(request, PresignRequestSchema);
  if (!parsed.success) return parsed.response;

  const late = await getLateClient();
  const { data, error } = await late.media.getMediaPresignedUrl({
    body: {
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
    },
  });

  if (error) {
    return badGateway("Late API", error);
  }

  return NextResponse.json(data);
}
