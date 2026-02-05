"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAdminAnalytics, useSignupChart, useAdminUsers } from "@/hooks/use-admin";
import { StatsCards } from "./_components/stats-cards";
import { SignupChart } from "./_components/signup-chart";
import { getAvatarUrl } from "@/lib/avatar";

export default function AdminDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();
  const { data: signupsData, isLoading: signupsLoading } = useSignupChart(30);
  const { data: usersData, isLoading: usersLoading } = useAdminUsers({
    limit: 5,
    page: 1,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of users and platform metrics
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalUsers={analytics?.totalUsers || 0}
        activeSubscriptions={analytics?.activeSubscriptions || 0}
        canceledSubscriptions={analytics?.canceledSubscriptions || 0}
        inactiveUsers={analytics?.inactiveUsers || 0}
        growthRate={analytics?.growthRate || 0}
        isLoading={analyticsLoading}
      />

      {/* Chart */}
      <SignupChart
        data={signupsData?.signups || []}
        isLoading={signupsLoading}
      />

      {/* Recent Signups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Signups</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 animate-pulse"
                >
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-40 rounded bg-muted" />
                    <div className="h-2 w-24 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : usersData?.users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users yet
            </p>
          ) : (
            <div className="space-y-3">
              {usersData?.users.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <img
                    src={getAvatarUrl(user.email, "bottts")}
                    alt={user.email}
                    className="h-8 w-8 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
