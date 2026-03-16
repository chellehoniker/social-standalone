import { NextRequest, NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, serverError } from "@/lib/api/errors";

/**
 * GET /api/admin/tickets
 * List all support tickets (admin only).
 * Query params: status, category, page, limit
 */
export async function GET(request: NextRequest) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  try {
    const supabase = createServiceClient();
    let query = (supabase as any)
      .from("support_tickets")
      .select("*", { count: "exact" });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return serverError(error, { action: "adminListTickets" });
    }

    return NextResponse.json({
      tickets: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    return serverError(err, { action: "adminListTickets" });
  }
}
