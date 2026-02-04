import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireServerEnv } from "@/lib/env";
import { notFound } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const stripe = new Stripe(requireServerEnv("stripeSecretKey"));
  const sessionId = request.nextUrl.searchParams.get("id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID required" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      email: session.customer_email || session.metadata?.email,
      status: session.payment_status,
    });
  } catch {
    return notFound("Session");
  }
}
