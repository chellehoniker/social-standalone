import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { getLateClient } from "@/lib/late-api";
import { parseRequestBody } from "@/lib/validations";
import {
  unauthorized,
  forbidden,
  rateLimited,
  badGateway,
  serverError,
} from "@/lib/api/errors";
import { z } from "zod/v4";

const MediaPresignSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.enum([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/avi",
    "video/x-msvideo",
    "video/webm",
    "video/x-m4v",
    "application/pdf",
  ]),
  size: z.number().positive().max(5_368_709_120).optional(), // 5GB max
});

/**
 * POST /api/v1/media/presign
 * Get a presigned URL for uploading media files.
 * Body: { filename, contentType, size? }
 * Returns: { uploadUrl, publicUrl, key }
 */
export async function POST(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "mediaPresign" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const parsed = await parseRequestBody(request, MediaPresignSchema);
  if (!parsed.success) return parsed.response;

  try {
    const late = await getLateClient();
    const { data, error } = await late.media.getMediaPresignedUrl({
      body: parsed.data,
    });

    if (error) {
      return badGateway("Late API", error);
    }

    return NextResponse.json(data);
  } catch (err) {
    return serverError(err, { action: "mediaPresign" });
  }
}
