/**
 * Post Validation Schemas
 */

import { z } from "zod/v4";
import { PLATFORMS } from "@/lib/late-api/types";

const platformEnum = z.enum(PLATFORMS as unknown as [string, ...string[]]);

const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
});

/**
 * Schema for creating a new post (internal — matches GetLate API shape).
 * Used by the compose page and /api/late/posts route.
 */
export const CreatePostSchema = z.object({
  content: z.string().max(25000).optional(),
  mediaItems: z.array(mediaItemSchema).optional(),
  platforms: z
    .array(
      z.object({
        platform: platformEnum,
        accountId: z.string(),
        customContent: z.string().optional(),
      })
    )
    .min(1, "At least one platform is required"),
  scheduledFor: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
  timezone: z.string().optional(),
  queuedFromProfile: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

/**
 * Schema for creating a post via external API (/api/v1/posts).
 * Simplified format for Make.com/Zapier/n8n integrations.
 */
export const ExternalCreatePostSchema = z.object({
  content: z.string().max(25000).optional(),
  accountIds: z.array(z.string()).min(1, "At least one account ID is required"),
  scheduledAt: z.string().datetime().optional(),
  publishNow: z.boolean().optional().default(true),
  mediaItems: z.array(mediaItemSchema).optional(),
  timezone: z.string().optional(),
});

export type ExternalCreatePostInput = z.infer<typeof ExternalCreatePostSchema>;

/**
 * Schema for updating an existing post
 */
export const UpdatePostSchema = z.object({
  content: z.string().min(1).max(25000).optional(),
  scheduledFor: z.string().datetime().optional(),
  mediaItems: z.array(mediaItemSchema).optional(),
  platforms: z
    .array(
      z.object({
        platform: platformEnum,
        accountId: z.string(),
        customContent: z.string().optional(),
      })
    )
    .optional(),
});

export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
