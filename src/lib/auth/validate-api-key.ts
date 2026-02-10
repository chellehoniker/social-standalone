import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { hashApiKey, isValidApiKeyFormat } from "./api-keys";

export interface ApiKeyValidationResult {
  profile: Profile;
  profileId: string;
}

export interface ApiKeyValidationError {
  error: string;
  status: number;
}

/**
 * Validate an API key from the Authorization header.
 * Mirrors the validateTenant pattern but uses Bearer tokens instead of session cookies.
 * Uses createServiceClient() since there are no cookies in external API calls.
 */
export async function validateApiKey(
  request: Request
): Promise<ApiKeyValidationResult | ApiKeyValidationError> {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing Authorization header", status: 401 };
  }

  const token = authHeader.slice(7);
  if (!isValidApiKeyFormat(token)) {
    return { error: "Invalid API key format", status: 401 };
  }

  // 2. Hash and lookup
  const hash = hashApiKey(token);
  const supabase = createServiceClient();

  const { data, error: dbError } = await supabase
    .from("profiles")
    .select("*")
    .eq("api_key_hash", hash)
    .single();

  if (dbError || !data) {
    return { error: "Invalid API key", status: 401 };
  }

  const profile = data as Profile;

  // 3. Check subscription status
  if (profile.subscription_status !== "active") {
    return { error: "Subscription inactive", status: 403 };
  }

  if (profile.current_period_end) {
    const periodEnd = new Date(profile.current_period_end);
    if (new Date() > periodEnd) {
      return { error: "Subscription expired", status: 403 };
    }
  }

  // 4. Resolve effective profile ID (supports X-Profile-Id override)
  let effectiveProfileId = profile.getlate_profile_id;

  const profileOverride = request.headers.get("X-Profile-Id");
  if (profileOverride) {
    const hasAccess =
      profileOverride === profile.getlate_profile_id ||
      (profile.accessible_profile_ids &&
        profile.accessible_profile_ids.includes(profileOverride));

    if (hasAccess) {
      effectiveProfileId = profileOverride;
    } else {
      return { error: "Access denied to requested profile", status: 403 };
    }
  }

  if (!effectiveProfileId) {
    return { error: "GetLate profile not configured", status: 403 };
  }

  return {
    profile,
    profileId: effectiveProfileId,
  };
}

/**
 * Type guard to check if result is an error
 */
export function isApiKeyError(
  result: ApiKeyValidationResult | ApiKeyValidationError
): result is ApiKeyValidationError {
  return "error" in result;
}
