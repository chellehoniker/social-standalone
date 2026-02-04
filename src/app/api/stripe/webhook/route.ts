import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { requireServerEnv } from "@/lib/env";
import { getLateClient, type LateClient } from "@/lib/late-api";
import { createLogger } from "@/lib/api/logger";
import { badRequest, serverError } from "@/lib/api/errors";

const logger = createLogger("stripe-webhook");

/**
 * Find an existing GetLate profile that matches the user's email.
 * Checks profile name against email prefix (e.g., "john" for "john@example.com")
 * Also checks if the profile name contains the email or vice versa.
 */
async function findExistingGetLateProfile(
  late: LateClient,
  email: string
): Promise<string | null> {
  try {
    const { data } = await late.profiles.listProfiles();
    const profiles = data?.profiles || [];

    const emailPrefix = email.split("@")[0].toLowerCase();
    const emailLower = email.toLowerCase();

    // Look for exact match on name = email prefix
    for (const profile of profiles) {
      const profileName = (profile.name || "").toLowerCase();

      // Exact match on email prefix
      if (profileName === emailPrefix) {
        return profile._id;
      }

      // Profile name contains email or email prefix
      if (profileName.includes(emailPrefix) || profileName.includes(emailLower)) {
        return profile._id;
      }

      // Email contains profile name (for cases like profile "john.doe" and email "john.doe@example.com")
      if (emailPrefix.includes(profileName) && profileName.length > 2) {
        return profile._id;
      }
    }

    return null;
  } catch (e) {
    logger.error(e, { action: "listProfiles", email });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(requireServerEnv("stripeSecretKey"));
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      requireServerEnv("stripeWebhookSecret")
    );
  } catch (err) {
    logger.warn("Webhook signature verification failed", { error: String(err) });
    return badRequest("Invalid signature");
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.metadata?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!email) {
          logger.warn("No email in checkout session", { sessionId: session.id });
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionItem = subscription.items.data[0];

        // Get Late client singleton
        const late = await getLateClient();

        // First, check if user already has a GetLate profile
        let getlateProfileId = await findExistingGetLateProfile(late, email);

        // Only create a new profile if one doesn't exist
        if (!getlateProfileId) {
          try {
            const { data: profileData, error: lateError } =
              await late.profiles.createProfile({
                body: { name: email.split("@")[0] },
              });

            if (lateError) {
              logger.error(lateError, { action: "createProfile", email });
            } else {
              getlateProfileId = profileData?.profile?._id || null;
            }
          } catch (e) {
            logger.error(e, { action: "createProfile", email });
          }
        } else {
          logger.info(`Found existing GetLate profile`, { email, profileId: getlateProfileId });
        }

        // Check if Supabase profile exists (by email)
        const { data: existingProfileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        const existingProfile = existingProfileData as { id: string } | null;

        if (existingProfile) {
          // Update existing profile
          await supabase
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              subscription_id: subscriptionId,
              subscription_status: "active",
              price_id: subscriptionItem.price.id,
              current_period_end: new Date(
                subscriptionItem.current_period_end * 1000
              ).toISOString(),
              getlate_profile_id: getlateProfileId || existingProfile.id,
            } as never)
            .eq("email", email);
        } else {
          // Create placeholder profile (will be linked when user authenticates)
          // Generate a temporary UUID that will be replaced on auth
          const tempId = crypto.randomUUID();
          await supabase.from("profiles").insert({
            id: tempId,
            email,
            stripe_customer_id: customerId,
            subscription_id: subscriptionId,
            subscription_status: "active",
            price_id: subscriptionItem.price.id,
            current_period_end: new Date(
              subscriptionItem.current_period_end * 1000
            ).toISOString(),
            getlate_profile_id: getlateProfileId,
          } as never);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionItem = subscription.items.data[0];

        const status =
          subscription.status === "active"
            ? "active"
            : subscription.status === "past_due"
            ? "past_due"
            : "canceled";

        await supabase
          .from("profiles")
          .update({
            subscription_status: status,
            current_period_end: new Date(
              subscriptionItem.current_period_end * 1000
            ).toISOString(),
            price_id: subscriptionItem.price.id,
          } as never)
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
            subscription_id: null,
          } as never)
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
          } as never)
          .eq("stripe_customer_id", customerId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return serverError(error, { eventType: event.type });
  }
}
