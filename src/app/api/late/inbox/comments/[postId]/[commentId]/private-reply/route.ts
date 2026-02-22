import { NextRequest, NextResponse } from "next/server";
import {
  validateTenantFromRequest,
  isValidationError,
} from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import { z } from "zod/v4";

const PrivateReplySchema = z.object({
  accountId: z.string().min(1),
  message: z.string().min(1).max(10000),
});

/**
 * POST /api/late/inbox/comments/[postId]/[commentId]/private-reply
 * Sends a private reply to a comment (Facebook or Instagram).
 * One private reply per comment, 7-day window.
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { postId, commentId } = await params;

  let body: z.infer<typeof PrivateReplySchema>;
  try {
    body = PrivateReplySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Required: accountId, message" },
      { status: 400 }
    );
  }

  const late = await getLateClient();

  const { data, error } = await late.comments.sendPrivateReplyToComment({
    path: { postId, commentId },
    body: {
      accountId: body.accountId,
      message: body.message,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to send private reply" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
