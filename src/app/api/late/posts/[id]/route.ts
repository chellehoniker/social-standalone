import { NextRequest, NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

/**
 * GET /api/late/posts/[id]
 * Returns a single post
 */
export async function GET(
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

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
  const { data, error } = await late.posts.getPost({
    path: { postId: id },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }

  // Verify post belongs to tenant's profile
  if (data?.post?.profileId !== validation.profileId) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/late/posts/[id]
 * Updates a post
 */
export async function PUT(
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
  const body = await request.json();

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });

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

  const { data, error } = await late.posts.updatePost({
    path: { postId: id },
    body,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/late/posts/[id]
 * Deletes a post
 */
export async function DELETE(
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

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });

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

  const { error } = await late.posts.deletePost({
    path: { postId: id },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
