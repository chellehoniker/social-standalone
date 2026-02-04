import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Use service client to update profile (bypass RLS)
      const serviceClient = createServiceClient();

      // Check if there's an existing profile with this email (created by Stripe webhook)
      const { data: existingProfile } = await serviceClient
        .from("profiles")
        .select("*")
        .eq("email", data.user.email!)
        .single();

      if (existingProfile) {
        // If the profile ID doesn't match the auth user ID, we need to migrate it
        if (existingProfile.id !== data.user.id) {
          // Delete the temporary profile
          await serviceClient
            .from("profiles")
            .delete()
            .eq("id", existingProfile.id);

          // Create new profile with correct auth user ID, preserving all data
          await serviceClient.from("profiles").insert({
            id: data.user.id,
            email: existingProfile.email,
            stripe_customer_id: existingProfile.stripe_customer_id,
            getlate_profile_id: existingProfile.getlate_profile_id,
            subscription_status: existingProfile.subscription_status,
            subscription_id: existingProfile.subscription_id,
            price_id: existingProfile.price_id,
            current_period_end: existingProfile.current_period_end,
          });
        }
        // If IDs match, profile is already correctly linked
      } else {
        // No profile exists yet - create one (user might have logged in without paying)
        // They'll be redirected to pricing by middleware
        await serviceClient.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email!,
          subscription_status: "inactive",
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
