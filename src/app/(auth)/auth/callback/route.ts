import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { clientEnv } from "@/lib/env";
import { createLogger } from "@/lib/api/logger";

const logger = createLogger("auth-callback");

interface ProfileData {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  getlate_profile_id: string | null;
  subscription_status: string;
  subscription_id: string | null;
  price_id: string | null;
  current_period_end: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Use configured app URL, not request origin (which may be internal container address)
  const appUrl = clientEnv.appUrl;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error(error, { step: "exchangeCodeForSession", code: code.substring(0, 10) + "..." });
      return NextResponse.redirect(`${appUrl}/login?error=auth_failed&reason=exchange`);
    }

    if (!data.user) {
      logger.warn("No user returned from exchangeCodeForSession", { code: code.substring(0, 10) + "..." });
      return NextResponse.redirect(`${appUrl}/login?error=auth_failed&reason=no_user`);
    }

    logger.info("Auth successful", { userId: data.user.id, email: data.user.email });

    try {
      // Use service client to update profile (bypass RLS)
      const serviceClient = createServiceClient();

      // Check if there's an existing profile with this email (created by Stripe webhook)
      const { data: profileData } = await serviceClient
        .from("profiles")
        .select("*")
        .eq("email", data.user.email!)
        .single();

      const existingProfile = profileData as ProfileData | null;

      // Check if user is a grandfathered StorytellerOS subscriber
      const { data: grandfatheredData } = await serviceClient
        .from("grandfathered_users")
        .select("getlate_profile_id")
        .eq("email", data.user.email!)
        .single();

      const grandfathered = grandfatheredData as { getlate_profile_id: string } | null;

      if (existingProfile) {
        // If the profile ID doesn't match the auth user ID, we need to migrate it
        if (existingProfile.id !== data.user.id) {
          // Delete the temporary profile
          await serviceClient
            .from("profiles")
            .delete()
            .eq("id", existingProfile.id);

          // Create new profile with correct auth user ID, preserving all data
          // If grandfathered, override with active status and their GetLate profile
          await serviceClient.from("profiles").insert({
            id: data.user.id,
            email: existingProfile.email,
            stripe_customer_id: existingProfile.stripe_customer_id,
            getlate_profile_id: grandfathered?.getlate_profile_id || existingProfile.getlate_profile_id,
            subscription_status: grandfathered ? "active" : existingProfile.subscription_status,
            subscription_id: existingProfile.subscription_id,
            price_id: existingProfile.price_id,
            current_period_end: existingProfile.current_period_end,
          } as never);
        } else if (grandfathered) {
          // Profile exists with correct ID but user is grandfathered - update status
          await serviceClient
            .from("profiles")
            .update({
              subscription_status: "active",
              getlate_profile_id: grandfathered.getlate_profile_id,
            } as never)
            .eq("id", data.user.id);
        }
        // If IDs match and not grandfathered, profile is already correctly linked
      } else {
        // No profile exists yet - create one
        // If grandfathered, give them active status; otherwise they'll be redirected to pricing
        await serviceClient.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email!,
          subscription_status: grandfathered ? "active" : "inactive",
          getlate_profile_id: grandfathered?.getlate_profile_id || null,
        } as never);
      }

      logger.info("Profile setup complete", { userId: data.user.id });
      return NextResponse.redirect(`${appUrl}${next}`);
    } catch (profileError) {
      logger.error(profileError, { step: "profile_setup", userId: data.user.id, email: data.user.email });
      // Still redirect to dashboard - auth succeeded, profile error can be handled later
      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  // No code provided
  logger.warn("No code in callback URL");
  return NextResponse.redirect(`${appUrl}/login?error=auth_failed&reason=no_code`);
}
