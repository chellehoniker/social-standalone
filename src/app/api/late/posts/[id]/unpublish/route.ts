import { NextRequest, NextResponse } from "next/server";
import {
  validateTenantFromRequest,
  isValidationError,
} from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * POST /api/late/posts/[id]/unpublish
 * Unpublishes a published post (removes from platform, keeps Late record).
 * Not supported for Instagram and TikTok.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { id } = await params;

  const late = await getLateClient();

  // Verify this post belongs to the tenant
  const { data: existingPost } = await late.posts.getPost({
    path: { postId: id },
  });

  if (existingPost?.post?.profileId !== validation.profileId) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data, error } = await late.posts.unpublishPost({
    path: { postId: id },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to unpublish post" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
