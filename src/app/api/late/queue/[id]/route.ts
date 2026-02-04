import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * DELETE /api/late/queue/[id]
 * Deletes a queue slot
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

  const { profileId } = validation;
  const { id } = await params;

  const late = await getLateClient();
  const { error } = await late.queue.deleteQueueSlot({
    query: {
      profileId,
      queueId: id,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete queue slot" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
