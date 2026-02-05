"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Logo } from "@/components/shared/logo";
import { PLATFORMS, PLATFORM_NAMES } from "@/lib/late-api";
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Share2,
  Zap,
  Shield,
  ArrowRight,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render until mounted
  if (!mounted) {
    return null;
  }

  // Show loading state while auth is resolving
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const features = [
    {
      icon: Calendar,
      title: "Visual Calendar",
      description: "See all your scheduled content at a glance",
    },
    {
      icon: Clock,
      title: "Smart Queue",
      description: "Set posting times once, auto-schedule the rest",
    },
    {
      icon: ImageIcon,
      title: "Media Support",
      description: "Upload images and videos up to 5GB",
    },
    {
      icon: Share2,
      title: "13 Platforms",
      description: "Instagram, TikTok, YouTube, X, LinkedIn & more",
    },
    {
      icon: Zap,
      title: "Quick Scheduling",
      description: "Create and schedule posts in seconds",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security for your accounts",
    },
  ];

  const faqs = [
    {
      question: "What is Author Automations Social?",
      answer:
        "Author Automations Social is a powerful social media scheduling tool designed for authors and content creators. Schedule posts across 13 platforms from a single interface.",
    },
    {
      question: "What platforms are supported?",
      answer:
        "Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, Pinterest, Threads, Bluesky, Snapchat, Telegram, Google Business, and Reddit.",
    },
    {
      question: "How does billing work?",
      answer:
        "We offer monthly and annual subscription plans. You can cancel anytime from your account settings. All payments are processed securely through Stripe.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes! We use industry-standard security practices. All authentication is handled securely through OAuth, and we never store your social media passwords.",
    },
    {
      question: "Can I try it before subscribing?",
      answer:
        "Currently we don't offer a free trial, but you can cancel your subscription within the first 7 days for a full refund if you're not satisfied.",
    },
    {
      question: "How do I get support?",
      answer:
        "Contact us at support@authorautomations.com or through the help section in your dashboard. We typically respond within 24 hours.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute -top-40 -right-40 z-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/10 md:bg-primary/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 z-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/10 md:bg-primary/25 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden md:block absolute top-1/3 -left-20 z-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden md:block absolute top-1/2 right-0 z-0 w-[350px] h-[350px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Logo size="md" />

          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="hidden sm:inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button asChild>
              <Link href="/pricing">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Social media scheduling
              <br />
              <span className="text-primary">made simple</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Schedule posts across 13 platforms from one beautiful interface.
              Built for authors, creators, and marketers who want to grow their
              audience without the hassle.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          {/* Platform Icons */}
          <div className="mt-16">
            <p className="text-center text-sm font-medium text-muted-foreground">
              Supports 13 platforms
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform}
                  className="flex flex-col items-center gap-2 group"
                  title={PLATFORM_NAMES[platform]}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-all duration-200 group-hover:bg-accent group-hover:scale-105">
                    <PlatformIcon platform={platform} size="lg" showColor />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {PLATFORM_NAMES[platform]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Everything you need</h2>
            <p className="mt-4 text-muted-foreground">
              A complete scheduling solution for authors and content creators.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="mt-4 text-muted-foreground">
              Got questions? We&apos;ve got answers.
            </p>
          </div>

          <div className="mt-12">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border py-4">
                <h3 className="font-medium">{faq.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold">Ready to grow your audience?</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of authors and creators who use Author Automations
              Social to schedule their content and grow their platform.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  Get Started Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Author Automations. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
