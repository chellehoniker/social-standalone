import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

/**
 * Admin email - the master account holder for this application
 */
const ADMIN_EMAIL = "chelle@atheniacreative.com";

/**
 * Check if an email belongs to an admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

/**
 * Require admin access - redirects to /dashboard if not admin
 *
 * Use in async Server Components/Layouts to protect admin routes.
 * This runs server-side before any content is rendered.
 */
export async function requireAdmin(): Promise<{
  user: User;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Use service client to fetch profile (bypasses RLS)
  const serviceClient = createServiceClient();
  const { data, error: profileError } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !data) {
    redirect("/dashboard");
  }

  const profile = data as Profile;

  // Check if user is admin (by email OR by is_admin flag)
  if (!isAdminEmail(user.email) && !profile.is_admin) {
    redirect("/dashboard");
  }

  return { user, profile };
}

/**
 * Admin validation result for API routes
 */
export interface AdminValidation {
  user: User;
  profile: Profile;
}

/**
 * Admin validation error for API routes
 */
export interface AdminValidationError {
  error: string;
  status: 401 | 403;
}

/**
 * Type guard to check if result is an error
 */
export function isAdminValidationError(
  result: AdminValidation | AdminValidationError
): result is AdminValidationError {
  return "error" in result;
}

/**
 * Validate admin access for API routes
 *
 * Unlike requireAdmin(), this doesn't redirect but returns an error object.
 * Use this in API route handlers.
 */
export async function validateAdmin(): Promise<
  AdminValidation | AdminValidationError
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Authentication required", status: 401 };
  }

  // Use service client to fetch profile
  const serviceClient = createServiceClient();
  const { data, error: profileError } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !data) {
    return { error: "Profile not found", status: 403 };
  }

  const profile = data as Profile;

  // Check if user is admin
  if (!isAdminEmail(user.email) && !profile.is_admin) {
    return { error: "Admin access required", status: 403 };
  }

  return { user, profile };
}
