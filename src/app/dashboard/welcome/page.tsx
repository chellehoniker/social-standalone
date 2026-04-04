"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccounts, useConnectAccount } from "@/hooks";
import { useAISettings } from "@/hooks/use-ai-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ConnectPlatformGrid } from "@/app/dashboard/accounts/_components/connect-platform-grid";
import { AISettingsSection } from "@/components/settings/ai-settings-section";
import type { Platform } from "@/lib/late-api";
import {
  Share2,
  Wand2,
  ListOrdered,
  Bell,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PenSquare,
  Sparkles,
} from "lucide-react";

const TOTAL_STEPS = 4;

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const { data: accountsData } = useAccounts();
  const { data: aiSettings } = useAISettings();
  const connectMutation = useConnectAccount();

  const accounts = accountsData?.accounts || [];
  const connectedPlatforms = new Set<string>(accounts.map((a: any) => a.platform as string));
  const hasAccounts = accounts.length > 0;
  const hasAI = aiSettings?.ai_enabled || false;

  const handleConnect = (platform: Platform) => {
    connectMutation.mutate({ platform });
  };

  const completeOnboarding = async () => {
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // Non-blocking — onboarding state is secondary to letting the user proceed
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handleFinish = (path: string) => {
    completeOnboarding();
    router.push(path);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {step} of {TOTAL_STEPS}</span>
          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back
            </Button>
          )}
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      {/* Step 1: Feature Showcase */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              Here&apos;s what you can do
            </h1>
            <p className="text-muted-foreground">
              Author Automations Social helps you reach readers across every platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<Share2 className="h-6 w-6 text-blue-500" />}
              title="Multi-Platform Scheduling"
              description="Publish to Facebook, Instagram, TikTok, YouTube, Pinterest, LinkedIn, and Threads — all from one place."
            />
            <FeatureCard
              icon={<Wand2 className="h-6 w-6 text-purple-500" />}
              title="AI Campaign Generation"
              description="Generate 7-30 days of posts with images and videos in minutes. Just describe your goal."
            />
            <FeatureCard
              icon={<ListOrdered className="h-6 w-6 text-green-500" />}
              title="Smart Queue"
              description="Set your posting schedule once. Drop content into the queue and it goes out automatically."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6 text-amber-500" />}
              title="Failure Monitoring"
              description="Get notified instantly if a post fails or an account disconnects. One-click retry."
            />
          </div>

          <div className="flex justify-center">
            <Button size="lg" onClick={() => setStep(2)}>
              Let&apos;s get you set up
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Connect Accounts */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Connect your accounts</h1>
            <p className="text-muted-foreground">
              Choose which platforms you want to post to. You can always add more later.
            </p>
          </div>

          {hasAccounts && (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {accounts.length} {accounts.length === 1 ? "account" : "accounts"} connected
              </span>
            </div>
          )}

          <ConnectPlatformGrid
            onConnect={handleConnect}
            connectedPlatforms={connectedPlatforms}
            isConnecting={connectMutation.isPending}
            connectingPlatform={connectMutation.variables?.platform}
          />

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Skip for now
            </Button>
            <Button onClick={() => setStep(3)} disabled={!hasAccounts}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: AI Setup (Optional) */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Set up AI campaigns</h1>
            <p className="text-muted-foreground">
              Add your AI API key to generate entire campaigns automatically.
              This is optional — you can always add it later in Settings.
            </p>
          </div>

          {hasAI && (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                AI is configured and ready
              </span>
            </div>
          )}

          <AISettingsSection />

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(4)}>
              Skip for now
            </Button>
            <Button onClick={() => setStep(4)}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: First Action */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
            <p className="text-muted-foreground">
              What would you like to do first?
            </p>
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-around text-center">
                <div>
                  <div className="text-2xl font-bold">{accounts.length}</div>
                  <div className="text-xs text-muted-foreground">Accounts</div>
                </div>
                <div>
                  <Badge variant={hasAI ? "default" : "secondary"}>
                    {hasAI ? "AI Ready" : "AI Not Set Up"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleFinish("/dashboard/compose")}
              className="group rounded-lg border border-border p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <PenSquare className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-semibold">Create a Post</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Write and schedule a single post to your connected accounts.
              </p>
            </button>

            <button
              onClick={() => handleFinish("/dashboard/create")}
              className="group rounded-lg border border-border p-6 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Sparkles className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="font-semibold">Generate a Campaign</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Let AI create a full multi-day campaign with images and captions.
              </p>
            </button>
          </div>

          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => completeOnboarding()}>
              Or explore on your own
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
