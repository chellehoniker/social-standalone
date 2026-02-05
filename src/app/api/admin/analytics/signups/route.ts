import { NextRequest, NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { SignupChartSchema } from "@/lib/validations/admin";
import { unauthorized, forbidden } from "@/lib/api/errors";

/**
 * GET /api/admin/analytics/signups
 * Get signup data for chart (grouped by day)
 */
export async function GET(request: NextRequest) {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const parsed = SignupChartSchema.safeParse({
    days: searchParams.get("days"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 }
    );
  }

  const { days } = parsed.data;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const supabase = createServiceClient();

  // Fetch profiles created in the date range
  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Admin] Failed to fetch signups:", error);
    return NextResponse.json(
      { error: "Failed to fetch signups" },
      { status: 500 }
    );
  }

  const profiles = (data || []) as { created_at: string }[];

  // Group by date
  const signupsByDate = new Map<string, number>();

  // Initialize all dates in range with 0
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split("T")[0];
    signupsByDate.set(dateKey, 0);
  }

  // Count signups per day
  profiles.forEach((profile) => {
    const dateKey = profile.created_at.split("T")[0];
    signupsByDate.set(dateKey, (signupsByDate.get(dateKey) || 0) + 1);
  });

  // Convert to array format for chart
  const signups = Array.from(signupsByDate.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json({
    signups,
    total: profiles.length,
    days,
  });
}
