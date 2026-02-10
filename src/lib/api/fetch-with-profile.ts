import { useAppStore } from "@/stores/app-store";

/**
 * Fetch wrapper that includes the selected profile ID header.
 * Use this for all API calls that support multi-profile.
 *
 * This function reads the selected profile from Zustand store and includes
 * it as the X-Profile-Id header. The server validates access permissions.
 */
export async function fetchWithProfile(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const selectedProfileId = useAppStore.getState().selectedProfileId;

  const headers = new Headers(options?.headers);

  // Add profile ID header if a non-default profile is selected
  if (selectedProfileId) {
    headers.set("X-Profile-Id", selectedProfileId);
  }

  // Always include credentials for auth cookies
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

/**
 * Helper to get fetch options with profile header.
 * Useful when you need to build options manually.
 */
export function getProfileHeaders(): Record<string, string> {
  const selectedProfileId = useAppStore.getState().selectedProfileId;
  return selectedProfileId ? { "X-Profile-Id": selectedProfileId } : {};
}
