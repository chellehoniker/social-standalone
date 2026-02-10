import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";

/**
 * GET /api/late/profiles
 * Returns the tenant's single profile
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const late = await getLateClient();
  const { data, error } = await late.profiles.getProfile({
    path: { profileId },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/late/profiles
 * Updates the tenant's profile
 */
export async function PUT(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const body = await request.json();

  const late = await getLateClient();
  const { data, error } = await late.profiles.updateProfile({
    path: { profileId },
    body: {
      name: body.name,
      timezone: body.timezone,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
