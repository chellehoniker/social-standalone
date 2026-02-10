import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badGateway } from "@/lib/api/errors";
import {
  parseRequestBody,
  CreateQueueSlotSchema,
  UpdateQueueSlotSchema,
} from "@/lib/validations";

/**
 * GET /api/late/queue
 * Returns queue slots for the tenant's profile (supports multi-profile via X-Profile-Id header)
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;
  const queueId = searchParams.get("queueId");
  const all = searchParams.get("all") === "true";

  try {
    const late = await getLateClient();
    const { data, error } = await late.queue.listQueueSlots({
      query: {
        profileId,
        queueId: queueId || undefined,
        all: all || undefined,
      },
    });

    if (error) {
      return badGateway("Late API", error);
    }

    return NextResponse.json(data);
  } catch (err) {
    // SDK throws LateApiError on 404 when no queue schedule exists
    const statusCode = (err as { statusCode?: number }).statusCode || 500;
    if (statusCode === 404) {
      return NextResponse.json({ slots: [] });
    }
    console.error("[queue] Error listing slots:", err);
    return badGateway("Late API", err);
  }
}

/**
 * POST /api/late/queue
 * Creates a new queue slot (supports multi-profile via X-Profile-Id header)
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const parsed = await parseRequestBody(request, CreateQueueSlotSchema);
  if (!parsed.success) return parsed.response;

  const late = await getLateClient();
  const { data, error } = await late.queue.createQueueSlot({
    body: {
      ...parsed.data,
      profileId,
    },
  });

  if (error) {
    return badGateway("Late API", error);
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/late/queue
 * Updates a queue slot (supports multi-profile via X-Profile-Id header)
 */
export async function PUT(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const parsed = await parseRequestBody(request, UpdateQueueSlotSchema);
  if (!parsed.success) return parsed.response;

  const late = await getLateClient();
  const { data, error } = await late.queue.updateQueueSlot({
    body: {
      ...parsed.data,
      profileId,
    },
  });

  if (error) {
    return badGateway("Late API", error);
  }

  return NextResponse.json(data);
}
