"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface StatsCardsProps {
  totalUsers: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  inactiveUsers: number;
  growthRate: number;
  isLoading?: boolean;
}

export function StatsCards({
  totalUsers,
  activeSubscriptions,
  canceledSubscriptions,
  inactiveUsers,
  growthRate,
  isLoading,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active",
      value: activeSubscriptions,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Canceled",
      value: canceledSubscriptions,
      icon: UserX,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Inactive",
      value: inactiveUsers,
      icon: AlertTriangle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      label: "Growth",
      value: `${growthRate > 0 ? "+" : ""}${growthRate}%`,
      icon: growthRate >= 0 ? TrendingUp : TrendingDown,
      color: growthRate >= 0 ? "text-green-500" : "text-red-500",
      bgColor: growthRate >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="h-6 w-12 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className={`inline-flex p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
