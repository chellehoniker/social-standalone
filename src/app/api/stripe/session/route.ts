import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
  } catch (error) {
    console.error("Failed to retrieve session:", error);
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }
}
