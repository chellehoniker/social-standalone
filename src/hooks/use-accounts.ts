import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "./use-server-auth";
import { fetchWithProfile } from "@/lib/api/fetch-with-profile";
import type { Platform } from "@/lib/late-api";
import { isPlatform } from "@/lib/type-guards";

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
  const serverAuth = useServerAuth();

  // Server auth is only available in protected routes (dashboard)
  const isAuthenticated = serverAuth?.isAuthenticated ?? false;
  const getlateProfileId = serverAuth?.getlateProfileId;

  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: async () => {
      const response = await fetchWithProfile("/api/late/accounts");
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
  const serverAuth = useServerAuth();

  const isAuthenticated = serverAuth?.isAuthenticated ?? false;
  const getlateProfileId = serverAuth?.getlateProfileId;

  return useQuery({
    queryKey: accountKeys.health(),
    queryFn: async () => {
      const response = await fetchWithProfile("/api/late/accounts/health");
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
  const serverAuth = useServerAuth();
  const isAuthenticated = serverAuth?.isAuthenticated ?? false;

  return useMutation({
    mutationFn: async ({ platform }: { platform: Platform }) => {
      if (!isAuthenticated) throw new Error("Not authenticated");

      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/callback`;
      const response = await fetchWithProfile(
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
      const response = await fetchWithProfile(`/api/late/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }
      return response.json();
    },
    onMutate: async (accountId) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });
      const previous = queryClient.getQueryData(accountKeys.list());
      // Optimistically remove the account from the cache
      queryClient.setQueryData(accountKeys.list(), (old: any) => {
        if (!old?.accounts) return old;
        return { ...old, accounts: old.accounts.filter((a: any) => a._id !== accountId) };
      });
      return { previous };
    },
    onError: (_err, _accountId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(accountKeys.list(), context.previous);
      }
    },
    onSettled: () => {
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
    (acc: Partial<Record<Platform, Account[]>>, account: Account) => {
      if (isPlatform(account.platform)) {
        if (!acc[account.platform]) acc[account.platform] = [];
        acc[account.platform]!.push(account);
      }
      return acc;
    },
    {} as Partial<Record<Platform, Account[]>>
  );

  return { data: accountsByPlatform, accounts: data?.accounts, ...rest };
}
