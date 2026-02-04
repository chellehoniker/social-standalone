import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * POST /api/late/posts/[id]/retry
 * Retries a failed post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { id } = await params;

  const late = await getLateClient();

  // First verify this post belongs to the tenant
  const { data: existingPost } = await late.posts.getPost({
    path: { postId: id },
  });

  if (existingPost?.post?.profileId !== validation.profileId) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 }
    );
  }

  const { data, error } = await late.posts.retryPost({
    path: { postId: id },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to retry post" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
