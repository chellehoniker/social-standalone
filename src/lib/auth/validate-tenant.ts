import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";

export interface TenantValidationResult {
  user: User;
  profile: Profile;
  profileId: string;
}

export interface TenantValidationError {
  error: string;
  status: number;
}

export interface ValidateTenantOptions {
  /**
   * Override the profile ID to use for this request.
   * Used for multi-profile (pen name) support.
   * If not provided, uses the user's primary getlate_profile_id.
   */
  profileIdOverride?: string | null;
}

/**
 * Validates the current user's session and retrieves their tenant profile.
 * Use this at the start of every protected API route.
 *
 * @param options - Optional configuration including profile override for multi-profile support
 * @returns TenantValidationResult on success, TenantValidationError on failure
 */
export async function validateTenant(
  options?: ValidateTenantOptions
): Promise<TenantValidationResult | TenantValidationError> {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  // 2. Get user's profile (tenant record)
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  if (profileError || !profile) {
    return { error: "Profile not found", status: 404 };
  }

  // 3. Check subscription status
  if (profile.subscription_status !== "active") {
    return { error: "Subscription inactive", status: 403 };
  }

  // 4. Determine effective profile ID
  let effectiveProfileId = profile.getlate_profile_id;

  // Check for profile override (multi-profile support)
  if (options?.profileIdOverride) {
    const overrideId = options.profileIdOverride;

    // Verify the user has access to the requested profile
    const hasAccess =
      overrideId === profile.getlate_profile_id ||
      (profile.accessible_profile_ids &&
        profile.accessible_profile_ids.includes(overrideId));

    if (hasAccess) {
      effectiveProfileId = overrideId;
    } else {
      // User doesn't have access to requested profile - fall back to primary
      console.warn(
        `[validateTenant] User ${user.id} attempted to access profile ${overrideId} without permission`
      );
    }
  }

  // 5. Check GetLate profile exists
  if (!effectiveProfileId) {
    return { error: "GetLate profile not configured", status: 403 };
  }

  return {
    user,
    profile,
    profileId: effectiveProfileId,
  };
}

/**
 * Type guard to check if result is an error
 */
export function isValidationError(
  result: TenantValidationResult | TenantValidationError
): result is TenantValidationError {
  return "error" in result;
}

/**
 * Extract profile override from request headers.
 * Use this with validateTenant for multi-profile support.
 */
export function getProfileOverride(request: Request): string | null {
  return request.headers.get("X-Profile-Id");
}

/**
 * Validate tenant with profile override from request header.
 * Convenience wrapper for API routes.
 */
export async function validateTenantFromRequest(
  request: Request
): Promise<TenantValidationResult | TenantValidationError> {
  const profileIdOverride = getProfileOverride(request);
  return validateTenant({ profileIdOverride });
}
