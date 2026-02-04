/**
 * Post Validation Schemas
 */

import { z } from "zod/v4";
import { PLATFORMS } from "@/lib/late-api/types";

const platformEnum = z.enum(PLATFORMS as unknown as [string, ...string[]]);

const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});

const platformDataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Schema for creating a new post
 */
export const CreatePostSchema = z.object({
  content: z.string().min(1, "Content is required").max(25000),
  accountIds: z.array(z.string()).min(1, "At least one account is required"),
  scheduledAt: z.string().datetime().optional(),
  useQueue: z.boolean().optional(),
  mediaItems: z.array(mediaItemSchema).optional(),
  platformData: z.record(platformEnum, platformDataSchema).optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

/**
 * Schema for updating an existing post
 */
export const UpdatePostSchema = z.object({
  content: z.string().min(1).max(25000).optional(),
  scheduledAt: z.string().datetime().optional(),
  mediaItems: z.array(mediaItemSchema).optional(),
  platformData: z.record(platformEnum, platformDataSchema).optional(),
});

export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
