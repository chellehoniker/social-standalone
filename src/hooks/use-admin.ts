import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/lib/supabase/types";
import type { UserFilters, UpdateUserInput, CreateUserInput } from "@/lib/validations/admin";

export const adminKeys = {
  all: ["admin"] as const,
  users: (filters?: UserFilters) => ["admin", "users", filters] as const,
  user: (id: string) => ["admin", "users", id] as const,
  analytics: () => ["admin", "analytics"] as const,
  signups: (days: number) => ["admin", "signups", days] as const,
};

export interface UsersResponse {
  users: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsResponse {
  totalUsers: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  pastDueSubscriptions: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  growthRate: number;
}

export interface SignupsResponse {
  signups: { date: string; count: number }[];
  total: number;
  days: number;
}

/**
 * Hook to fetch all users (admin only)
 */
export function useAdminUsers(filters?: Partial<UserFilters>) {
  const queryString = new URLSearchParams();
  if (filters?.search) queryString.set("search", filters.search);
  if (filters?.status) queryString.set("status", filters.status);
  if (filters?.page) queryString.set("page", filters.page.toString());
  if (filters?.limit) queryString.set("limit", filters.limit.toString());

  return useQuery({
    queryKey: adminKeys.users(filters as UserFilters),
    queryFn: async (): Promise<UsersResponse> => {
      const url = `/api/admin/users${queryString.toString() ? `?${queryString}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch users");
      }
      return response.json();
    },
  });
}

/**
 * Hook to fetch a single user
 */
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: async (): Promise<Profile> => {
      const response = await fetch(`/api/admin/users/${userId}`, { credentials: "include" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch user");
      }
      return response.json();
    },
    enabled: !!userId,
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics() });
    },
  });
}

/**
 * Hook to update a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateUserInput;
    }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics() });
    },
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics() });
    },
  });
}

/**
 * Hook to fetch analytics summary
 */
export function useAdminAnalytics() {
  return useQuery({
    queryKey: adminKeys.analytics(),
    queryFn: async (): Promise<AnalyticsResponse> => {
      const response = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch analytics");
      }
      return response.json();
    },
  });
}

/**
 * Hook to fetch signup data for chart
 */
export function useSignupChart(days = 30) {
  return useQuery({
    queryKey: adminKeys.signups(days),
    queryFn: async (): Promise<SignupsResponse> => {
      const response = await fetch(`/api/admin/analytics/signups?days=${days}`, { credentials: "include" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch signups");
      }
      return response.json();
    },
  });
}
