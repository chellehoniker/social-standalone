"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Wand2,
  Video,
  Sparkles,
  Check,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  const features = [
    {
      icon: Calendar,
      title: "Visual Calendar",
      description:
        "Drag-and-drop content calendar. See every scheduled post at a glance and rearrange your strategy in seconds.",
    },
    {
      icon: Clock,
      title: "Smart Queue",
      description:
        "Set your ideal posting times once. Drop content into the queue and it goes out automatically at the right time.",
    },
    {
      icon: Wand2,
      title: "AI Campaign Builder",
      description:
        "Generate a full 30-day campaign in minutes. AI writes platform-specific captions in your brand voice.",
    },
    {
      icon: ImageIcon,
      title: "AI Image Generation",
      description:
        "Create stunning social images with FreePik AI. Automatic sizing for every platform — no design skills needed.",
    },
    {
      icon: Video,
      title: "AI Video & Music",
      description:
        "Generate short-form video with AI music, up to 60 seconds. Perfect for TikTok, Reels, and Shorts.",
    },
    {
      icon: Share2,
      title: "13 Platforms",
      description:
        "Instagram, TikTok, YouTube, X, LinkedIn, Facebook, Pinterest, Threads, Bluesky, and more — all from one screen.",
    },
    {
      icon: Sparkles,
      title: "Carousels & Slideshows",
      description:
        "Create multi-slide carousel posts with AI. Each slide tells part of your story, automatically sized per platform.",
    },
    {
      icon: Bot,
      title: "Claude Code Plugin",
      description:
        "Create and schedule posts directly from Claude Code or Cowork. AI writes your captions with full context of your work.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "API keys encrypted with AES-256. Row-level security isolates every account. Your data is never shared.",
    },
  ];

  const faqs = [
    {
      question: "What is Author Automations Social?",
      answer:
        "A social media scheduling and AI content creation platform built for authors and content creators. Schedule posts across 13 platforms, generate AI images and videos, and run full 30-day campaigns — all from one tool.",
    },
    {
      question: "How does the AI campaign builder work?",
      answer:
        "You tell it your objective (like 'promote my book launch'), choose your platforms and duration, and AI generates a complete content plan with unique captions for each platform, image prompts, and video scripts. You review and edit everything before scheduling. The AI respects your brand guide, prose style, and social media strategy.",
    },
    {
      question: "What AI services does it use?",
      answer:
        "You bring your own API keys for the AI provider of your choice — OpenAI, Anthropic (Claude), or Google Gemini for caption writing. FreePik AI for image generation, video creation, and music. Your keys are encrypted and never shared.",
    },
    {
      question: "What platforms are supported?",
      answer:
        "Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, Pinterest, Threads, Bluesky, Snapchat, Telegram, Google Business, and Reddit. Each platform gets unique, optimized captions — never copy-paste.",
    },
    {
      question: "Can I create videos?",
      answer:
        "Yes! AI generates video from your image prompts with customizable camera motion (zoom, pan, cinematic). Add AI-generated music that matches your mood. Videos up to 60 seconds, composited server-side with FFmpeg. Perfect for TikTok and Instagram Reels.",
    },
    {
      question: "What about the Claude Code plugin?",
      answer:
        "Our official Claude Code / Cowork plugin lets you create posts and run campaigns directly from Claude. Claude writes the captions itself — using your brand guides and the full context of your conversation. Install it from the plugin marketplace.",
    },
    {
      question: "How much does it cost?",
      answer:
        "Just $29/month. Unlimited posts, all 13 platforms, AI campaign builder, image and video generation, smart queue, visual calendar — everything included. Annual plan available at $290/year (save 17%). Cancel anytime.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely. Social media auth is OAuth-only (we never see your passwords). AI API keys are encrypted with AES-256-GCM. Row-level security ensures your data is isolated. Multi-tenant architecture prevents cross-account access.",
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
            {isLoggedIn ? (
              <>
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                )}
                <Button asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/docs/api"
                  className="hidden sm:inline-block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  API Docs
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
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                )}
                <Button asChild>
                  <Link href="/pricing">Start for $29/mo</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1 text-sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Now with AI Campaign Builder
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stop posting one at a time.
              <br />
              <span className="text-primary">Launch a 30-day campaign in minutes.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              AI writes your captions in your brand voice. Generates images,
              videos, and music. Schedules everything across 13 platforms.
              All for <strong className="text-foreground">$29/month</strong> — you
              control your own AI spend with your own API keys.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {isLoggedIn ? (
                <Button size="lg" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link href="/pricing">
                      Start Your First Campaign
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Platform Icons */}
          <div className="mt-16">
            <p className="text-center text-sm font-medium text-muted-foreground">
              Post everywhere from one place
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

      {/* How It Works */}
      <section className="relative z-10 py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">From idea to scheduled in 4 steps</h2>
            <p className="mt-4 text-muted-foreground">
              The AI does the heavy lifting. You stay in control.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Set Your Goal",
                description: "Tell the AI what you&apos;re promoting and which platforms to target.",
              },
              {
                step: "2",
                title: "AI Writes Your Content",
                description: "Unique captions for each platform, matched to your brand voice and style guides.",
              },
              {
                step: "3",
                title: "AI Generates Media",
                description: "Images, carousels, videos with music — all automatically sized for each platform.",
              },
              {
                step: "4",
                title: "Review & Schedule",
                description: "Edit anything, then schedule the whole campaign with one click. Done.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Everything you need to own your social presence</h2>
            <p className="mt-4 text-muted-foreground">
              Scheduling, AI content creation, video, music, carousels, and a Claude plugin.
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

      {/* AI Control Section */}
      <section className="relative z-10 py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Your AI. Your keys. Your budget.</h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              We don&apos;t mark up AI costs or lock you into our models. Bring your own
              API keys, pick your preferred providers, and pay only for what you use — directly
              to the AI provider. No hidden fees. No usage caps from us.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Choose Your AI</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use OpenAI, Anthropic (Claude), or Google Gemini for caption generation. Switch anytime.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Pick Your Image Model</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                FreePik AI with 6 models: Nano Banana Pro, Mystic, Flux 2 Pro, Seedream, and more. You choose quality vs. speed.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Keys Stay Encrypted</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your API keys are encrypted with AES-256-GCM. We decrypt only at the moment of use, never log them, and you can revoke anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Simple pricing. No surprises.</h2>
            <p className="mt-4 text-muted-foreground">
              Everything included. No feature gates. No per-post limits.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-primary bg-card p-8 sm:p-10 shadow-lg shadow-primary/5">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">$29</span>
                <span className="text-xl text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                or $290/year (save 17%)
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2 w-full max-w-lg">
                {[
                  "Unlimited scheduled posts",
                  "All 13 platforms",
                  "AI campaign builder (30 days)",
                  "AI image generation",
                  "AI video creation (up to 60s)",
                  "AI music generation",
                  "Carousel & slideshow posts",
                  "Smart posting queue",
                  "Visual content calendar",
                  "Claude Code / Cowork plugin",
                  "Brand & prose style guides",
                  "API access for integrations",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" className="mt-8 w-full max-w-xs" asChild>
                <Link href="/pricing">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Cancel anytime. Secure payment via Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="mt-12">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border py-5">
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
            <h2 className="text-2xl font-bold sm:text-3xl">
              Your audience is waiting. Start creating.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              30 days of content. 13 platforms. AI-generated images and videos.
              All scheduled and ready to go — in the time it takes to write one post manually.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  Start for $29/month
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs/api">View API Docs</Link>
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
            <div className="flex items-center gap-4">
              <Link
                href="/docs/api"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                API Docs
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
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
