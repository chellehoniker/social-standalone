import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireServerEnv, clientEnv } from "@/lib/env";
import { parseRequestBody, CheckoutSessionSchema } from "@/lib/validations";
import { badRequest, serverError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(requireServerEnv("stripeSecretKey"));

  const parsed = await parseRequestBody(request, CheckoutSessionSchema);
  if (!parsed.success) return parsed.response;

  const { priceId, email } = parsed.data;

  // Validate price ID against allowed prices
  const validPrices = [
    clientEnv.stripePriceMonthly,
    clientEnv.stripePriceAnnual,
  ];
  if (!validPrices.includes(priceId)) {
    return badRequest("Invalid price selected");
  }

  try {

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId: string | undefined;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${clientEnv.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientEnv.appUrl}/pricing`,
      metadata: {
        email,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return serverError(error, { action: "createCheckoutSession" });
  }
}
