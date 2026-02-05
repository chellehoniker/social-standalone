import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "./use-server-auth";

export const profileKeys = {
  all: ["profiles"] as const,
  detail: (id: string) => ["profiles", id] as const,
};

/**
 * Hook to fetch the tenant's single profile
 * In multi-tenant mode, each user has exactly one profile
 */
export function useProfile() {
  const serverAuth = useServerAuth();
  const isAuthenticated = serverAuth?.isAuthenticated ?? false;
  const getlateProfileId = serverAuth?.getlateProfileId;

  return useQuery({
    queryKey: profileKeys.all,
    queryFn: async () => {
      const response = await fetch("/api/late/profiles");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch profile");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to get the current profile ID
 * In multi-tenant mode, this comes from the Supabase profile
 */
export function useCurrentProfileId(): string | undefined {
  const serverAuth = useServerAuth();
  return serverAuth?.getlateProfileId || undefined;
}

/**
 * Hook to update the profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      timezone,
    }: {
      name?: string;
      timezone?: string;
    }) => {
      const response = await fetch("/api/late/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

// Legacy exports for backwards compatibility
// useProfiles now returns the single profile
export const useProfiles = useProfile;

// useCreateProfile is not needed in multi-tenant mode
// Profiles are created automatically during signup
export function useCreateProfile() {
  return useMutation({
    mutationFn: async () => {
      throw new Error("Profile creation is handled automatically during signup");
    },
  });
}
