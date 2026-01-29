"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { ApiKeyModal } from "@/components/shared/api-key-modal";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Logo } from "@/components/shared/logo";
import { PLATFORMS, PLATFORM_NAMES } from "@/lib/late-api";
import {
  Moon,
  Sun,
  Github,
  Calendar,
  Clock,
  Upload,
  Sparkles,
  Check,
  X,
  Lock,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// Custom hook for intersection observer animations
function useIntersectionObserver(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}

// Animated section component
function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { apiKey } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (apiKey) {
      router.push("/dashboard");
    }
  }, [apiKey, router]);

  const features = [
    {
      icon: Calendar,
      title: "See Your Whole Month at a Glance",
      description:
        'No more "wait, did I post yesterday?" Drag posts to reschedule. Click to edit. Your content strategy, visualized.',
      benefit: "Never miss a posting day",
    },
    {
      icon: Clock,
      title: "Set It and Forget It",
      description:
        "Tell us your best times. We'll handle the rest. Your queue fills automatically. Never miss a posting window again.",
      benefit: "Save hours every week",
    },
    {
      icon: Upload,
      title: "Upload Once, Post Everywhere",
      description:
        "Videos up to 5GB. Images auto-optimized. Platform-specific settings when you need them. Same content, perfect for each platform.",
      benefit: "One upload, 13 platforms",
    },
    {
      icon: Sparkles,
      title: "Platform-Perfect Every Time",
      description:
        "TikTok privacy settings, YouTube titles, Pinterest boards, Instagram collaborators. All the options, none of the hassle.",
      benefit: "Native feel everywhere",
    },
  ];

  const comparisonData = [
    { without: "Log into 5+ apps daily", with: "One dashboard for everything" },
    { without: "Copy-paste content everywhere", with: "Write once, post to all" },
    { without: "Forget to post consistently", with: "Schedule and forget" },
    { without: "Miss your best posting times", with: "Smart queue handles timing" },
    { without: "Pay $29/month minimum", with: "Free forever" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size="md" />

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="https://github.com/getlate-dev/latewiz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">Star on GitHub</span>
            </a>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-9 w-9"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button onClick={() => setShowApiKeyModal(true)} size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stop juggling tabs.
              <br />
              <span className="text-primary">Post everywhere from one place.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Schedule to Instagram, TikTok, YouTube, and 10 more platforms.{" "}
              <span className="font-semibold text-foreground">Free forever.</span>{" "}
              <span className="font-semibold text-foreground">Open source.</span>
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              <Button
                size="lg"
                onClick={() => setShowApiKeyModal(true)}
                className="group h-12 px-8 text-base"
              >
                <Rocket className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                Start Scheduling - It&apos;s Free
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card. No signup wall. Just paste your API key.
              </p>
            </div>

            {/* Product Screenshot */}
            <div className="relative mt-16">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <Image
                  src="/docs/screenshot.png"
                  alt="LateWiz calendar interface showing scheduled posts"
                  width={1200}
                  height={675}
                  className="w-full"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Showcase */}
      <section className="border-y border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              One dashboard. 13 platforms.{" "}
              <span className="text-primary">Zero headaches.</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={100} className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform}
                  className="group relative flex flex-col items-center gap-2"
                  onMouseEnter={() => setHoveredPlatform(platform)}
                  onMouseLeave={() => setHoveredPlatform(null)}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card transition-all duration-300 sm:h-16 sm:w-16",
                      hoveredPlatform === platform &&
                        "scale-110 border-primary/50 shadow-lg"
                    )}
                  >
                    <PlatformIcon
                      platform={platform}
                      size="xl"
                      showColor={hoveredPlatform === platform}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      hoveredPlatform === platform
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {PLATFORM_NAMES[platform]}
                  </span>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200} className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Yes, even{" "}
              <span className="font-medium text-foreground">Threads</span> and{" "}
              <span className="font-medium text-foreground">Bluesky</span>.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Problem/Solution Comparison */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Life before and after LateWiz
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={100} className="mt-12">
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-2">
                <div className="border-r border-border bg-muted/50 p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <X className="h-5 w-5 text-destructive" />
                    <span className="font-semibold">Without LateWiz</span>
                  </div>
                </div>
                <div className="bg-primary/5 p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="font-semibold text-foreground">
                      With LateWiz
                    </span>
                  </div>
                </div>
              </div>
              {comparisonData.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 border-t border-border"
                >
                  <div className="border-r border-border bg-muted/50 p-4 sm:p-6">
                    <p className="text-sm text-muted-foreground sm:text-base">
                      {item.without}
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 sm:p-6">
                    <p className="text-sm font-medium text-foreground sm:text-base">
                      {item.with}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Built for people who actually post content, not for enterprise
              feature checklists.
            </p>
          </AnimatedSection>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {features.map((feature, index) => (
              <AnimatedSection
                key={feature.title}
                delay={100 + index * 100}
                className="group"
              >
                <div className="h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg sm:p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <Check className="h-3 w-3" />
                    {feature.benefit}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* "Why Free?" Section */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              &ldquo;Wait, this is actually free?&rdquo;
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
              <p className="text-lg leading-relaxed text-muted-foreground">
                Yes. Here&apos;s why:
              </p>
              <p className="mt-4 text-lg leading-relaxed">
                LateWiz is powered by{" "}
                <a
                  href="https://getlate.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Late
                </a>
                , the social media scheduling API. We built this to show what&apos;s
                possible with our API.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-semibold">You get:</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A full-featured scheduler, forever free
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-semibold">We get:</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Developers see what Late can do
                  </p>
                </div>
              </div>
              <p className="mt-6 font-medium">
                Win-win. No catch. No &ldquo;free tier&rdquo; limitations.
              </p>
              <p className="mt-2 text-muted-foreground">
                Just bring your Late API key (also free to start).
              </p>

              <div className="mt-8">
                <Button asChild variant="outline">
                  <a
                    href="https://getlate.dev/dashboard/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Your Free API Key
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="mt-6 text-2xl font-bold sm:text-3xl">
                Open Source
              </h2>
              <blockquote className="mx-auto mt-4 max-w-xl text-lg italic text-muted-foreground">
                &ldquo;I can see exactly what this code does.&rdquo;
              </blockquote>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {[
                  "MIT Licensed",
                  "Self-host anywhere",
                  "No vendor lock-in",
                  "Community-driven",
                  "Privacy-first",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-sm"
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button asChild>
                  <a
                    href="https://github.com/getlate-dev/latewiz"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Star on GitHub
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://github.com/getlate-dev/latewiz#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read the Code
                  </a>
                </Button>
              </div>

              <div className="mt-10 border-t border-border pt-8">
                <p className="text-sm font-medium text-muted-foreground">
                  Deploy your own:
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="https://vercel.com/new/clone?repository-url=https://github.com/getlate-dev/latewiz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 76 65" fill="currentColor">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                    Vercel
                  </a>
                  <a
                    href="https://railway.app/template/latewiz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.113 14.669a.8.8 0 0 1 .088-.147l.055-.073h7.022a1.32 1.32 0 0 0 1.32-1.32V5.05a.8.8 0 0 1 .147-.466l.073-.099H.113v10.184zm8.685-14.556A.8.8 0 0 1 8.945 0h14.942l-.068.09a.8.8 0 0 1-.147.147l-.073.055H8.871l-.073-.18z" />
                      <path d="M.113.113A.8.8 0 0 1 .26.026L.333 0h7.022a1.32 1.32 0 0 1 1.32 1.32v7.022a.8.8 0 0 1-.147.466l-.073.099H.113V.113zm23.774 14.556a.8.8 0 0 1-.088.147l-.055.073h-7.022a1.32 1.32 0 0 0-1.32 1.32v8.079a.8.8 0 0 1-.147.466l-.073.099h8.705V14.669z" />
                      <path d="M23.887 23.887a.8.8 0 0 1-.147.088l-.073.025h-7.022a1.32 1.32 0 0 1-1.32-1.32v-7.022a.8.8 0 0 1 .147-.466l.073-.099h8.342v8.794z" />
                    </svg>
                    Railway
                  </a>
                  <a
                    href="https://github.com/getlate-dev/latewiz#docker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.185.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
                    </svg>
                    Docker
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <AnimatedSection>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Ready to simplify your social media?
            </h2>
            <div className="mt-8">
              <Button
                size="lg"
                onClick={() => setShowApiKeyModal(true)}
                className="group h-12 px-8 text-base"
              >
                <Rocket className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                Start Scheduling Now - Free
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                Takes 30 seconds. No credit card needed.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo size="sm" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Built with{" "}
                <a
                  href="https://getlate.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary"
                >
                  Late
                </a>{" "}
                API
              </span>
              <span>•</span>
              <a
                href="https://github.com/getlate-dev/latewiz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                GitHub
              </a>
              <span>•</span>
              <a
                href="https://docs.getlate.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                Docs
              </a>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} LateWiz • MIT License
          </p>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
    </div>
  );
}
