import { NextResponse } from "next/server";
import { validateAdmin, isAdminValidationError } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden } from "@/lib/api/errors";
import type { SubscriptionStatus } from "@/lib/supabase/types";

interface ProfileRow {
  subscription_status: SubscriptionStatus;
  created_at: string;
}

/**
 * GET /api/admin/analytics
 * Get analytics summary for admin dashboard
 */
export async function GET() {
  const validation = await validateAdmin();
  if (isAdminValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    return forbidden(validation.error);
  }

  const supabase = createServiceClient();

  // Get all profiles for analysis
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_status, created_at");

  if (error) {
    console.error("[Admin] Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }

  const profiles = (data || []) as ProfileRow[];

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Calculate metrics
  const totalUsers = profiles.length;
  const activeSubscriptions = profiles.filter(
    (p) => p.subscription_status === "active"
  ).length;
  const canceledSubscriptions = profiles.filter(
    (p) => p.subscription_status === "canceled"
  ).length;
  const pastDueSubscriptions = profiles.filter(
    (p) => p.subscription_status === "past_due"
  ).length;
  const inactiveUsers = profiles.filter(
    (p) => p.subscription_status === "inactive"
  ).length;

  // New users this month
  const newUsersThisMonth = profiles.filter(
    (p) => new Date(p.created_at) >= thisMonthStart
  ).length;

  // New users last month
  const newUsersLastMonth = profiles.filter(
    (p) =>
      new Date(p.created_at) >= lastMonthStart &&
      new Date(p.created_at) <= lastMonthEnd
  ).length;

  // Growth rate (percentage)
  const growthRate =
    newUsersLastMonth > 0
      ? Math.round(
          ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        )
      : newUsersThisMonth > 0
      ? 100
      : 0;

  return NextResponse.json({
    totalUsers,
    activeSubscriptions,
    canceledSubscriptions,
    pastDueSubscriptions,
    inactiveUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    growthRate,
  });
}
