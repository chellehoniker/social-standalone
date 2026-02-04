import { NextRequest, NextResponse } from "next/server";
import Late from "@getlatedev/node";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

/**
 * GET /api/late/profiles
 * Returns the tenant's single profile
 */
export async function GET() {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
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
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const body = await request.json();

  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
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
