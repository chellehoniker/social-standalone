"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { ApiKeyModal } from "@/components/shared/api-key-modal";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Logo } from "@/components/shared/logo";
import { PLATFORMS, PLATFORM_NAMES } from "@/lib/late-api";
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Moon,
  Sun,
  Github,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const router = useRouter();
  const { apiKey, hasHydrated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (hasHydrated && apiKey) {
      router.push("/dashboard");
    }
  }, [apiKey, hasHydrated, router]);

  // Don't render until hydrated to avoid flash
  if (!hasHydrated) {
    return null;
  }

  const features = [
    {
      icon: Calendar,
      title: "Visual Calendar",
      description: "See all your scheduled content at a glance with our intuitive calendar view.",
    },
    {
      icon: Clock,
      title: "Smart Queue",
      description: "Set up posting times once and let LateWiz handle the rest automatically.",
    },
    {
      icon: ImageIcon,
      title: "Media Support",
      description: "Upload images and videos up to 5GB with automatic optimization.",
    },
    {
      icon: Sparkles,
      title: "Platform Settings",
      description: "TikTok privacy, YouTube titles, Pinterest boards, and more.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size="md" />

          <div className="flex items-center gap-4">
            <a
              href="https://getlate.dev/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="https://github.com/getlate-dev/latewiz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
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
            <Button onClick={() => setShowApiKeyModal(true)}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your social media
            <br />
            <span className="text-primary">scheduling wizard</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Schedule posts across 13 platforms with a single, beautiful interface.
            Open source, free to use, and powered by Late.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => setShowApiKeyModal(true)}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/getlate-dev/latewiz"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
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
                  <PlatformIcon
                    platform={platform}
                    size="lg"
                    showColor
                  />
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
      <section className="border-t border-border bg-muted/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Everything you need</h2>
            <p className="mt-4 text-muted-foreground">
              A complete scheduling solution for social media managers and marketers.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Open Source Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Github className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Open Source</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              LateWiz is MIT licensed and free to use. Self-host it on your own
              infrastructure, contribute to the project, or just use it as-is.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild>
                <a
                  href="https://github.com/getlate-dev/latewiz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Star on GitHub
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://docs.getlate.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the Docs
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              Built with{" "}
              <a
                href="https://getlate.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Late
              </a>
              {" "}API
            </p>
          </div>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
    </div>
  );
}
