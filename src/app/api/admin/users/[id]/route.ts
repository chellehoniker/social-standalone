import { NextRequest, NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { UpdateUserSchema } from "@/lib/validations/admin";
import { unauthorized, forbidden, notFound } from "@/lib/api/errors";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]
 * Get a single user by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const { id } = await params;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return notFound("User");
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/users/[id]
 * Update a user's subscription status or admin flag
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const { id } = await params;

  // Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Don't allow removing admin from self
  if (parsed.data.is_admin === false && id === validation.user.id) {
    return NextResponse.json(
      { error: "Cannot remove admin status from yourself" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check if user exists
  const { data: existingUserData } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", id)
    .single();

  const existingUser = existingUserData as { id: string; email: string } | null;

  if (!existingUser) {
    return notFound("User");
  }

  // If email is being changed, validate and update auth user
  if (parsed.data.email && parsed.data.email !== existingUser.email) {
    const { data: emailCheck } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", parsed.data.email)
      .single();

    if (emailCheck) {
      return NextResponse.json(
        { error: "Email already in use by another user" },
        { status: 409 }
      );
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      email: parsed.data.email,
    });

    if (authError) {
      console.error("[Admin] Failed to update auth email:", authError);
      return NextResponse.json(
        { error: "Failed to update user email" },
        { status: 500 }
      );
    }
  }

  // Update profile
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Admin] Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const { id } = await params;

  // Don't allow deleting self
  if (id === validation.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check if user exists
  const { data: userData } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", id)
    .single();

  const existingUser = userData as { id: string; email: string } | null;

  if (!existingUser) {
    return notFound("User");
  }

  // Delete profile (this won't delete the auth user, just the profile)
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) {
    console.error("[Admin] Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `User ${existingUser.email} deleted`,
  });
}
