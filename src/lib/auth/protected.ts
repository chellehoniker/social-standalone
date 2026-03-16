import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getLateClient } from "@/lib/late-api";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

/**
 * Require authentication - redirects to /login if not authenticated
 *
 * Use in async Server Components/Layouts to protect routes.
 * This runs server-side before any content is rendered.
 *
 * Uses getUser() instead of getSession() for stronger server-side
 * verification (makes a request to Supabase Auth server to verify JWT).
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}

/**
 * Require active subscription - redirects to /pricing if no subscription
 *
 * Use in async Server Components/Layouts for subscription-protected routes.
 * This runs server-side before any content is rendered.
 */
export async function requireSubscription(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    redirect("/pricing");
  }

  const profile = data as Profile;

  if (profile.subscription_status !== "active") {
    redirect("/pricing");
  }

  // Auto-provision Late profile if missing (safety net for webhook failures)
  if (!profile.getlate_profile_id) {
    try {
      const late = await getLateClient();
      const emailPrefix = (user.email || "user").split("@")[0];
      const { data: created } = await late.profiles.createProfile({
        body: { name: emailPrefix },
      });

      const newProfileId = created?.profile?._id;
      if (newProfileId) {
        const serviceClient = createServiceClient();
        await serviceClient
          .from("profiles")
          .update({ getlate_profile_id: newProfileId } as never)
          .eq("id", user.id);

        profile.getlate_profile_id = newProfileId;
        console.log(`[Auth] Auto-provisioned Late profile for ${user.email}: ${newProfileId}`);
      }
    } catch (e) {
      console.error(`[Auth] Failed to auto-provision Late profile for ${user.email}:`, e);
    }
  }

  return {
    user,
    profile,
  };
}

/**
 * Get current user if authenticated (no redirect)
 *
 * Use when you want to check auth state without forcing a redirect.
 * Returns null if not authenticated.
 *
 * Uses getUser() for server-side JWT verification.
 */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
