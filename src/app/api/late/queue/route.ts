import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * GET /api/late/queue
 * Returns queue slots for the tenant's profile
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;
  const queueId = searchParams.get("queueId");
  const all = searchParams.get("all") === "true";

  const late = await getLateClient();
  const { data, error } = await late.queue.listQueueSlots({
    query: {
      profileId,
      queueId: queueId || undefined,
      all: all || undefined,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * POST /api/late/queue
 * Creates a new queue slot
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const body = await request.json();

  const late = await getLateClient();
  const { data, error } = await late.queue.createQueueSlot({
    body: {
      ...body,
      profileId,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create queue slot" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/late/queue
 * Updates a queue slot
 */
export async function PUT(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const body = await request.json();

  const late = await getLateClient();
  const { data, error } = await late.queue.updateQueueSlot({
    body: {
      ...body,
      profileId,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update queue slot" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
