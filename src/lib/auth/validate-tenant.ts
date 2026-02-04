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

/**
 * Validates the current user's session and retrieves their tenant profile.
 * Use this at the start of every protected API route.
 *
 * @returns TenantValidationResult on success, TenantValidationError on failure
 */
export async function validateTenant(): Promise<
  TenantValidationResult | TenantValidationError
> {
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

  // 4. Check GetLate profile exists
  if (!profile.getlate_profile_id) {
    return { error: "GetLate profile not configured", status: 403 };
  }

  return {
    user,
    profile,
    profileId: profile.getlate_profile_id,
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
