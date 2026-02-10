import { NextRequest, NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import { UserFiltersSchema, CreateUserSchema } from "@/lib/validations/admin";
import { unauthorized, forbidden } from "@/lib/api/errors";
import type { SubscriptionStatus } from "@/lib/supabase/types";

/**
 * GET /api/admin/users
 * List all users with search, filter, and pagination
 */
export async function GET(request: NextRequest) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  // Parse query parameters (convert null to undefined for Zod)
  const searchParams = request.nextUrl.searchParams;
  const parsed = UserFiltersSchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 }
    );
  }

  const { search, status, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  // Build query
  const supabase = createServiceClient();
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });

  // Apply search filter
  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  // Apply status filter
  if (status && status !== "all") {
    query = query.eq("subscription_status", status);
  }

  // Apply pagination and ordering
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[Admin] Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  const totalPages = Math.ceil((count || 0) / limit);

  return NextResponse.json({
    users: data,
    total: count || 0,
    page,
    limit,
    totalPages,
  });
}

/**
 * POST /api/admin/users
 * Create a new user with auth account + profile
 */
export async function POST(request: NextRequest) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, profile_type, existing_profile_id, subscription_type, is_admin } =
    parsed.data;

  const supabase = createServiceClient();

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    return NextResponse.json(
      { error: "User with this email already exists" },
      { status: 409 }
    );
  }

  // 1. Create Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    console.error("[Admin] Failed to create auth user:", authError);
    return NextResponse.json(
      { error: authError?.message || "Failed to create auth user" },
      { status: 500 }
    );
  }

  const userId = authData.user.id;

  // 2. Handle GetLate profile
  let getlateProfileId: string | null = null;

  if (profile_type === "new") {
    try {
      const late = await getLateClient();
      const { data: profileData, error: lateError } =
        await late.profiles.createProfile({
          body: { name: email.split("@")[0] },
        });

      if (lateError) {
        console.error("[Admin] Failed to create GetLate profile:", lateError);
      } else {
        getlateProfileId = profileData?.profile?._id || null;
      }
    } catch (e) {
      console.error("[Admin] GetLate profile creation error:", e);
    }
  } else if (profile_type === "existing") {
    getlateProfileId = existing_profile_id || null;
  }

  // 3. Determine subscription fields
  let subscriptionStatus: SubscriptionStatus = "inactive";
  let currentPeriodEnd: string | null = null;

  if (subscription_type === "active") {
    subscriptionStatus = "active";
  } else if (subscription_type === "trial") {
    subscriptionStatus = "active";
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    currentPeriodEnd = trialEnd.toISOString();
  }

  // 4. Create profile record
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      getlate_profile_id: getlateProfileId,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      is_admin,
    } as never)
    .select()
    .single();

  if (profileError) {
    console.error("[Admin] Failed to create profile:", profileError);
    // Cleanup auth user
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Failed to create user profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(profile, { status: 201 });
}
