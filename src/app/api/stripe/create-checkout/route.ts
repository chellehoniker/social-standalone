import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { priceId, email } = await request.json();

    if (!priceId || !email) {
      return NextResponse.json(
        { error: "Price ID and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate price ID
    const validPrices = [
      process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL,
    ];
    if (!validPrices.includes(priceId)) {
      return NextResponse.json(
        { error: "Invalid price selected" },
        { status: 400 }
      );
    }

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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        email,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
