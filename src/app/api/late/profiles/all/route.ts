import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import type { Profile } from "@/lib/supabase/types";

interface AccessibleProfile {
  id: string;
  name: string;
  isOwner: boolean;
}

/**
 * GET /api/late/profiles/all
 * Returns all profiles the authenticated user has access to.
 * Includes the primary profile and any additional profiles from accessible_profile_ids.
 */
export async function GET() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's profile
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Build list of profile IDs to fetch
  const profileIds: string[] = [];

  // Always include the primary profile
  if (profile.getlate_profile_id) {
    profileIds.push(profile.getlate_profile_id);
  }

  // Add accessible profile IDs if any
  if (profile.accessible_profile_ids && profile.accessible_profile_ids.length > 0) {
    for (const id of profile.accessible_profile_ids) {
      if (!profileIds.includes(id)) {
        profileIds.push(id);
      }
    }
  }

  // If no profiles to fetch, return empty array
  if (profileIds.length === 0) {
    return NextResponse.json({ profiles: [] });
  }

  // Fetch profile details from GetLate
  const late = await getLateClient();
  const profiles: AccessibleProfile[] = [];

  for (const profileId of profileIds) {
    try {
      const { data, error } = await late.profiles.getProfile({
        path: { profileId },
      });

      if (!error && data?.profile) {
        profiles.push({
          id: data.profile._id || profileId,
          name: data.profile.name || "Unnamed Profile",
          isOwner: profileId === profile.getlate_profile_id,
        });
      }
    } catch (err) {
      console.error(`[profiles/all] Failed to fetch profile ${profileId}:`, err);
      // Continue with other profiles even if one fails
    }
  }

  return NextResponse.json({ profiles });
}
