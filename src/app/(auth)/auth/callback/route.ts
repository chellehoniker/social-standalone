import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { clientEnv, requireServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/api/logger";

const logger = createLogger("auth-callback");

/**
 * Check Stripe for an active subscription by email.
 * Catches Substack subscribers and other external subscription sources
 * that don't go through our checkout flow.
 */
async function findStripeSubscription(email: string): Promise<{
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: string;
} | null> {
  try {
    const stripe = new Stripe(requireServerEnv("stripeSecretKey"));
    const customers = await stripe.customers.list({ email, limit: 5 });

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const item = sub.items.data[0];
        return {
          customerId: customer.id,
          subscriptionId: sub.id,
          status: "active",
          priceId: item.price.id,
          currentPeriodEnd: new Date(
            item.current_period_end * 1000
          ).toISOString(),
        };
      }
    }

    return null;
  } catch (e) {
    logger.error(e, { action: "findStripeSubscription", email });
    return null;
  }
}

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

// Validate redirect path to prevent open redirect attacks
function sanitizeRedirectPath(path: string | null): string {
  const defaultPath = "/dashboard";
  if (!path) return defaultPath;

  // Must start with / and not contain protocol or double slashes
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return defaultPath;
  }

  // Only allow paths to known routes
  const allowedPrefixes = ["/dashboard", "/settings", "/callback"];
  if (!allowedPrefixes.some(prefix => path.startsWith(prefix))) {
    return defaultPath;
  }

  return path;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));

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
          // If migrating and profile has no Stripe data, check Stripe for external subscriptions
          let stripeData = {
            stripe_customer_id: existingProfile.stripe_customer_id,
            subscription_id: existingProfile.subscription_id,
            subscription_status: grandfathered ? "active" : existingProfile.subscription_status,
            price_id: existingProfile.price_id,
            current_period_end: existingProfile.current_period_end,
          };

          if (!grandfathered && existingProfile.subscription_status !== "active") {
            const stripeSub = await findStripeSubscription(data.user.email!);
            if (stripeSub) {
              logger.info("Found external Stripe subscription during migration", { email: data.user.email, customerId: stripeSub.customerId });
              stripeData = {
                stripe_customer_id: stripeSub.customerId,
                subscription_id: stripeSub.subscriptionId,
                subscription_status: stripeSub.status,
                price_id: stripeSub.priceId,
                current_period_end: stripeSub.currentPeriodEnd,
              };
            }
          }

          const newProfileData = {
            id: data.user.id,
            email: existingProfile.email,
            ...stripeData,
            getlate_profile_id: grandfathered?.getlate_profile_id || existingProfile.getlate_profile_id,
          };

          // Delete temp profile, then insert with real auth user ID
          await serviceClient
            .from("profiles")
            .delete()
            .eq("id", existingProfile.id);

          const { error: insertError } = await serviceClient
            .from("profiles")
            .insert(newProfileData as never);

          if (insertError) {
            // Recovery: re-create the old profile so data isn't lost
            logger.error(insertError, { step: "profile_migration_insert", userId: data.user.id });
            await serviceClient.from("profiles").insert({
              id: existingProfile.id,
              email: existingProfile.email,
              stripe_customer_id: existingProfile.stripe_customer_id,
              getlate_profile_id: existingProfile.getlate_profile_id,
              subscription_status: existingProfile.subscription_status,
              subscription_id: existingProfile.subscription_id,
              price_id: existingProfile.price_id,
              current_period_end: existingProfile.current_period_end,
            } as never);
          }
        } else if (grandfathered) {
          // Profile exists with correct ID but user is grandfathered - update status
          await serviceClient
            .from("profiles")
            .update({
              subscription_status: "active",
              getlate_profile_id: grandfathered.getlate_profile_id,
            } as never)
            .eq("id", data.user.id);
        } else if (existingProfile.subscription_status !== "active") {
          // Profile exists but inactive — check Stripe for external subscriptions (e.g. Substack)
          const stripeSub = await findStripeSubscription(data.user.email!);
          if (stripeSub) {
            logger.info("Found external Stripe subscription", { email: data.user.email, customerId: stripeSub.customerId });
            await serviceClient
              .from("profiles")
              .update({
                stripe_customer_id: stripeSub.customerId,
                subscription_id: stripeSub.subscriptionId,
                subscription_status: stripeSub.status,
                price_id: stripeSub.priceId,
                current_period_end: stripeSub.currentPeriodEnd,
              } as never)
              .eq("id", data.user.id);
          }
        }
        // If IDs match, not grandfathered, and already active — profile is correctly linked
      } else {
        // No profile exists yet - create one
        if (grandfathered) {
          await serviceClient.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email!,
            subscription_status: "active",
            getlate_profile_id: grandfathered.getlate_profile_id,
          } as never);
        } else {
          // Check Stripe for external subscriptions (e.g. Substack) before defaulting to inactive
          const stripeSub = await findStripeSubscription(data.user.email!);
          if (stripeSub) {
            logger.info("New user with existing Stripe subscription", { email: data.user.email, customerId: stripeSub.customerId });
            await serviceClient.from("profiles").upsert({
              id: data.user.id,
              email: data.user.email!,
              stripe_customer_id: stripeSub.customerId,
              subscription_id: stripeSub.subscriptionId,
              subscription_status: stripeSub.status,
              price_id: stripeSub.priceId,
              current_period_end: stripeSub.currentPeriodEnd,
            } as never);
          } else {
            await serviceClient.from("profiles").upsert({
              id: data.user.id,
              email: data.user.email!,
              subscription_status: "inactive",
            } as never);
          }
        }
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
