import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { getLateClient } from "@/lib/late-api";
import { parseRequestBody } from "@/lib/validations";
import { postBelongsToProfile } from "@/lib/late-api/ownership";
import {
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  serverError,
} from "@/lib/api/errors";
import { z } from "zod/v4";

const ExternalUpdatePostSchema = z.object({
  content: z.string().max(25000).optional(),
  scheduledAt: z.string().datetime().optional(),
});

/**
 * GET /api/v1/posts/[id]
 * Get a single post by ID (verifies ownership).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const { id } = await params;

  try {
    const late = await getLateClient();
    const { data, error } = await late.posts.getPost({
      path: { postId: id },
    });

    if (error) {
      return serverError(error, { action: "getPost", postId: id });
    }

    // Verify post belongs to user's profile
    if (!postBelongsToProfile(data?.post, validation.profileId)) {
      return notFound("Post");
    }

    return NextResponse.json(data);
  } catch (err) {
    return serverError(err, { action: "getPost", postId: id });
  }
}

/**
 * DELETE /api/v1/posts/[id]
 * Delete a post by ID (verifies ownership first).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const { id } = await params;

  try {
    const late = await getLateClient();

    // Verify ownership before deleting
    const { data: existingPost } = await late.posts.getPost({
      path: { postId: id },
    });

    if (!postBelongsToProfile(existingPost?.post, validation.profileId)) {
      return notFound("Post");
    }

    const { error } = await late.posts.deletePost({
      path: { postId: id },
    });

    if (error) {
      return serverError(error, { action: "deletePost", postId: id });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, { action: "deletePost", postId: id });
  }
}

/**
 * PATCH /api/v1/posts/[id]
 * Update a scheduled post (content and/or scheduledAt).
 * Verifies ownership first.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const { id } = await params;

  const parsed = await parseRequestBody(request, ExternalUpdatePostSchema);
  if (!parsed.success) return parsed.response;

  try {
    const late = await getLateClient();

    // Verify ownership before updating
    const { data: existingPost } = await late.posts.getPost({
      path: { postId: id },
    });

    if (!postBelongsToProfile(existingPost?.post, validation.profileId)) {
      return notFound("Post");
    }

    const { content, scheduledAt } = parsed.data;
    const { data, error } = await late.posts.updatePost({
      path: { postId: id },
      body: {
        ...(content !== undefined && { content }),
        ...(scheduledAt !== undefined && { scheduledFor: scheduledAt }),
      },
    });

    if (error) {
      return serverError(error, { action: "updatePost", postId: id });
    }

    return NextResponse.json(data ?? { success: true });
  } catch (err) {
    return serverError(err, { action: "updatePost", postId: id });
  }
}
