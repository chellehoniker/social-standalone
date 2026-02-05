import { NextRequest, NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { UserFiltersSchema } from "@/lib/validations/admin";
import { unauthorized, forbidden } from "@/lib/api/errors";

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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const parsed = UserFiltersSchema.safeParse({
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
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
