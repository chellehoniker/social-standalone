/**
 * Media Validation Schemas
 */

import { z } from "zod/v4";

/**
 * Allowed MIME types for media uploads
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const ALLOWED_MEDIA_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
] as const;

/**
 * Schema for presigned URL request
 */
export const PresignRequestSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    .regex(/^[\w\-. ]+$/, "Invalid filename characters"),
  contentType: z.enum(ALLOWED_MEDIA_TYPES, {
    error: "Unsupported media type. Allowed types: JPEG, PNG, GIF, WebP, MP4, MOV, WebM",
  }),
});

export type PresignRequestInput = z.infer<typeof PresignRequestSchema>;

/**
 * Check if a content type is an image
 */
export function isImageType(contentType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/**
 * Check if a content type is a video
 */
export function isVideoType(contentType: string): boolean {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(contentType);
}
