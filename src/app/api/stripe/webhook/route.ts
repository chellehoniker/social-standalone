import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Find an existing GetLate profile that matches the user's email.
 * Checks profile name against email prefix (e.g., "john" for "john@example.com")
 * Also checks if the profile name contains the email or vice versa.
 */
async function findExistingGetLateProfile(
  late: InstanceType<typeof import("@getlatedev/node").default>,
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
    console.error("Error listing GetLate profiles:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
          console.error("No email in checkout session");
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionItem = subscription.items.data[0];

        // Initialize Late client (dynamic import to avoid build-time env var check)
        const { default: Late } = await import("@getlatedev/node");
        const late = new Late({ apiKey: process.env.LATE_API_KEY! });

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
              console.error("Failed to create GetLate profile:", lateError);
            } else {
              getlateProfileId = profileData?.profile?._id || null;
            }
          } catch (e) {
            console.error("GetLate API error:", e);
          }
        } else {
          console.log(`Found existing GetLate profile for ${email}: ${getlateProfileId}`);
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
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
