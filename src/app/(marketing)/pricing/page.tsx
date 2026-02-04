"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

const plans = [
  {
    name: "Monthly",
    price: "$29",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
    features: [
      "Unlimited scheduled posts",
      "13 social platforms",
      "Visual calendar",
      "Smart queue scheduling",
      "Media uploads up to 5GB",
      "Priority support",
    ],
  },
  {
    name: "Annual",
    price: "$290",
    period: "/year",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL,
    badge: "Save 17%",
    popular: true,
    features: [
      "Everything in Monthly",
      "2 months free",
      "Priority support",
      "Early access to new features",
    ],
  },
];

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (priceId: string) => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(priceId);
    setError("");

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, email }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Schedule posts across 13 social platforms with one powerful tool.
            Start growing your audience today.
          </p>
        </div>

        {/* Email Input */}
        <div className="mb-12 max-w-md mx-auto">
          <Label htmlFor="email" className="text-base font-medium">
            Enter your email to get started
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? "border-primary shadow-lg" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="mt-2">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(plan.priceId!)}
                  disabled={loading !== null}
                >
                  {loading === plan.priceId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
