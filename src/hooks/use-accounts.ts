import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { Platform } from "@/lib/late-api";

export const accountKeys = {
  all: ["accounts"] as const,
  list: () => ["accounts", "list"] as const,
  health: () => ["accounts", "health"] as const,
  detail: (accountId: string) => ["accounts", "detail", accountId] as const,
};

export interface Account {
  _id: string;
  platform: Platform;
  username: string;
  displayName?: string;
  isActive: boolean;
  profilePicture?: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountHealth {
  accountId: string;
  isHealthy: boolean;
  error?: string;
}

/**
 * Hook to fetch all accounts for the tenant's profile
 */
export function useAccounts() {
  const { isAuthenticated, getlateProfileId } = useAuth();

  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: async () => {
      const response = await fetch("/api/late/accounts");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch accounts");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to fetch account health status
 */
export function useAccountsHealth() {
  const { isAuthenticated, getlateProfileId } = useAuth();

  return useQuery({
    queryKey: accountKeys.health(),
    queryFn: async () => {
      const response = await fetch("/api/late/accounts/health");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch account health");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to start OAuth connection flow
 */
export function useConnectAccount() {
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async ({ platform }: { platform: Platform }) => {
      if (!isAuthenticated) throw new Error("Not authenticated");

      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/callback`;
      const response = await fetch(
        `/api/late/connect/${platform}?redirect_url=${encodeURIComponent(redirectUrl)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get connect URL");
      }
      return response.json();
    },
  });
}

/**
 * Hook to delete/disconnect an account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/late/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

/**
 * Hook to get accounts grouped by platform
 */
export function useAccountsByPlatform() {
  const { data, ...rest } = useAccounts();

  const accountsByPlatform = data?.accounts?.reduce(
    (acc: Record<Platform, Account[]>, account: Account) => {
      const platform = account.platform as Platform;
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(account);
      return acc;
    },
    {} as Record<Platform, Account[]>
  );

  return { data: accountsByPlatform, accounts: data?.accounts, ...rest };
}
