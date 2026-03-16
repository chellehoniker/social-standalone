"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccounts } from "@/hooks";
import { useAISettings } from "@/hooks/use-ai-settings";
import {
  useCreateCampaign,
  useGeneratePlan,
  useGenerateMedia,
  useScheduleCampaign,
  useCampaign,
  useUpdateCampaignPost,
} from "@/hooks/use-campaigns";
import { useAppStore } from "@/stores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wand2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ImageIcon,
  Calendar,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { Platform } from "@/lib/late-api";
import { PLATFORM_NAMES } from "@/lib/late-api";

type Step = "objective" | "guides" | "generate" | "review" | "media" | "schedule";
const STEPS: Step[] = ["objective", "guides", "generate", "review", "media", "schedule"];

const STEP_LABELS: Record<Step, string> = {
  objective: "Objective",
  guides: "Review Guides",
  generate: "Generate Plan",
  review: "Review & Edit",
  media: "Generate Media",
  schedule: "Schedule",
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const { timezone } = useAppStore();
  const { data: accountsData } = useAccounts();
  const { data: aiSettings } = useAISettings();
  const accounts = (accountsData?.accounts || []) as any[];

  // Wizard state
  const [step, setStep] = useState<Step>("objective");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Step 1: Objective
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Step 6: Schedule
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // tomorrow
  );
  const [useQueue, setUseQueue] = useState(false);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});

  // Mutations
  const createCampaign = useCreateCampaign();
  const generatePlan = useGeneratePlan();
  const generateMedia = useGenerateMedia();
  const scheduleCampaign = useScheduleCampaign();
  const updatePost = useUpdateCampaignPost();
  const { data: campaignData, refetch: refetchCampaign } = useCampaign(campaignId || "");

  const campaign = campaignData?.campaign;
  const posts = campaignData?.posts || [];
  const plan = campaign?.post_plan || [];

  const currentStepIndex = STEPS.indexOf(step);

  const goNext = () => {
    const next = STEPS[currentStepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = STEPS[currentStepIndex - 1];
    if (prev) setStep(prev);
  };

  // Auto-populate accountMap when platforms change
  const updateAccountMap = (platforms: string[]) => {
    const map: Record<string, string> = {};
    for (const platform of platforms) {
      const account = accounts.find((a: any) => a.platform === platform);
      if (account) map[platform] = account._id;
    }
    setAccountMap(map);
  };

  // ── Step 1: Objective ──
  const handleCreateCampaign = async () => {
    try {
      const result = await createCampaign.mutateAsync({
        name,
        objective,
        duration_days: durationDays,
        platforms: selectedPlatforms,
      });
      setCampaignId(result.campaign.id);
      updateAccountMap(selectedPlatforms);
      goNext();
    } catch {
      toast.error("Failed to create campaign");
    }
  };

  // ── Step 3: Generate Plan ──
  const handleGenerate = async () => {
    if (!campaignId) return;
    try {
      await generatePlan.mutateAsync(campaignId);
      await refetchCampaign();
      goNext();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate plan");
    }
  };

  // ── Step 5: Generate Media ──
  const handleGenerateMedia = async () => {
    if (!campaignId) return;
    try {
      const result = await generateMedia.mutateAsync(campaignId);
      await refetchCampaign();
      toast.success(`Generated media: ${result.completed} succeeded, ${result.failed} failed`);
      goNext();
    } catch {
      toast.error("Failed to generate media");
    }
  };

  // ── Step 6: Schedule ──
  const handleSchedule = async () => {
    if (!campaignId) return;
    try {
      const result = await scheduleCampaign.mutateAsync({
        campaignId,
        startDate,
        timezone,
        useQueue,
        accountMap,
      });
      toast.success(`Scheduled ${result.scheduled} posts!`);
      router.push("/dashboard/calendar");
    } catch {
      toast.error("Failed to schedule campaign");
    }
  };

  // Get unique platforms from accounts
  const availablePlatforms = [...new Set(accounts.map((a: any) => a.platform as string))];

  if (!aiSettings?.ai_enabled) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wand2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold">AI Features Not Enabled</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              To create AI-powered campaigns, enable AI in your settings and add
              at least one AI provider key.
            </p>
            <Button className="mt-6" onClick={() => router.push("/dashboard/settings")}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Create Campaign
        </h1>
        <p className="text-muted-foreground">
          AI-powered social media campaign builder
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full ${
                i <= currentStepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
            <span
              className={`text-[10px] ${
                s === step ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Objective ── */}
      {step === "objective" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Campaign Objective
            </CardTitle>
            <CardDescription>
              What do you want to achieve with this campaign?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spring Book Launch"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Objective</Label>
              <Textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g., Promote my new cozy mystery 'Curses and Currents' launching April 1st. Build anticipation with behind-the-scenes content, character reveals, and pre-order links."
                rows={4}
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Duration</Label>
              <Select value={String(durationDays)} onValueChange={(v) => setDurationDays(Number(v))}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {availablePlatforms.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={(checked) => {
                        setSelectedPlatforms((prev) =>
                          checked
                            ? [...prev, platform]
                            : prev.filter((p) => p !== platform)
                        );
                      }}
                    />
                    <span className="text-sm">{PLATFORM_NAMES[platform as Platform] || platform}</span>
                  </label>
                ))}
              </div>
              {availablePlatforms.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Connect accounts in the Accounts page first.
                </p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!name || !objective || selectedPlatforms.length === 0 || createCampaign.isPending}
              onClick={handleCreateCampaign}
            >
              {createCampaign.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <>Next: Review Guides <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Review Guides ── */}
      {step === "guides" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Your Guides</CardTitle>
            <CardDescription>
              These guides will inform the AI when generating your campaign content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "prose_guide", label: "Prose Guide" },
              { key: "brand_guide", label: "Brand Guide" },
              { key: "copywriting_guide", label: "Copywriting Guide" },
              { key: "social_media_guide", label: "Social Media Guide" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">{label}</Label>
                  {aiSettings?.[key as keyof typeof aiSettings] ? (
                    <Badge variant="secondary" className="text-[10px]">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Set
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Not set
                    </Badge>
                  )}
                </div>
                {aiSettings?.[key as keyof typeof aiSettings] && (
                  <p className="text-xs text-muted-foreground line-clamp-2 rounded bg-muted p-2">
                    {String(aiSettings[key as keyof typeof aiSettings]).slice(0, 150)}...
                  </p>
                )}
              </div>
            ))}

            {aiSettings?.image_style_prompt && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Image Style</Label>
                <p className="text-xs text-muted-foreground rounded bg-muted p-2">
                  {aiSettings.image_style_prompt}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              You can edit your guides in{" "}
              <a href="/dashboard/settings" className="text-primary underline">Settings</a>.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={goNext} className="flex-1">
                Next: Generate <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Generate Plan ── */}
      {step === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Campaign Plan
            </CardTitle>
            <CardDescription>
              The AI will create {durationDays} days of social media content
              tailored to your objective and guides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm"><strong>Campaign:</strong> {name}</p>
              <p className="text-sm"><strong>Objective:</strong> {objective}</p>
              <p className="text-sm"><strong>Duration:</strong> {durationDays} days</p>
              <p className="text-sm"><strong>Platforms:</strong> {selectedPlatforms.map((p) => PLATFORM_NAMES[p as Platform] || p).join(", ")}</p>
              <p className="text-sm"><strong>AI Provider:</strong> {aiSettings?.preferred_ai_provider || "openai"}</p>
            </div>

            {generatePlan.isPending ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Generating your campaign plan...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This may take 30-60 seconds
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleGenerate} className="flex-1">
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Review & Edit ── */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review & Edit</CardTitle>
            <CardDescription>
              Review the generated content for each day. Click on a caption to edit it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {posts.map((post) => {
                  const dayPlan = plan.find((d: any) => d.day === post.day_number);
                  return (
                    <div key={post.id} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Day {post.day_number}
                          </Badge>
                          <span className="text-sm font-medium">
                            {dayPlan?.theme || ""}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {dayPlan?.contentType || "image"}
                        </Badge>
                      </div>

                      {/* Captions per platform */}
                      {Object.entries(post.caption_variants || {}).map(([platform, caption]) => (
                        <div key={platform} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">
                            {PLATFORM_NAMES[platform as Platform] || platform}
                          </Label>
                          <Textarea
                            defaultValue={caption as string}
                            rows={2}
                            className="text-xs resize-none"
                            onBlur={(e) => {
                              if (e.target.value !== caption) {
                                updatePost.mutate({
                                  campaignId: campaignId!,
                                  postId: post.id,
                                  data: {
                                    caption_variants: {
                                      ...post.caption_variants,
                                      [platform]: e.target.value,
                                    },
                                  },
                                });
                              }
                            }}
                          />
                        </div>
                      ))}

                      {/* Image prompt */}
                      {dayPlan?.imagePrompt && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> Image Prompt
                          </Label>
                          <p className="text-xs text-muted-foreground bg-muted rounded p-2">
                            {dayPlan.imagePrompt}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={goNext} className="flex-1">
                Next: Generate Media <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Generate Media ── */}
      {step === "media" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Generate Media
            </CardTitle>
            <CardDescription>
              Generate images for each day using FreePik AI.
              This may take several minutes for large campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generateMedia.isPending ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm font-medium">Generating images...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This takes 5-15 minutes for a 30-day campaign. You can wait here or come back later.
                  </p>
                </div>

                {/* Progress grid */}
                <div className="grid grid-cols-6 gap-2">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                        post.status === "ready"
                          ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                          : post.status === "failed"
                          ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                          : "bg-muted text-muted-foreground animate-pulse"
                      }`}
                    >
                      {post.day_number}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Show thumbnails if media already generated */}
                {posts.some((p) => Object.keys(p.media_urls || {}).length > 0) && (
                  <div className="grid grid-cols-5 gap-2">
                    {posts.slice(0, 10).map((post) => {
                      const firstUrl = Object.values(post.media_urls || {})[0] as string;
                      return (
                        <div key={post.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                          {firstUrl ? (
                            <img src={firstUrl} alt={`Day ${post.day_number}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                              {post.day_number}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleGenerateMedia} className="flex-1">
                    <ImageIcon className="mr-2 h-4 w-4" /> Generate Images
                  </Button>
                  {posts.some((p) => Object.keys(p.media_urls || {}).length > 0) && (
                    <Button variant="outline" onClick={goNext}>
                      Skip <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 6: Schedule ── */}
      {step === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Campaign
            </CardTitle>
            <CardDescription>
              Choose when to start posting and map platforms to accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-48"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Account Mapping</Label>
              <p className="text-[10px] text-muted-foreground">
                Select which account to use for each platform.
              </p>
              {selectedPlatforms.map((platform) => {
                const platformAccounts = accounts.filter((a: any) => a.platform === platform);
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-xs w-24">{PLATFORM_NAMES[platform as Platform] || platform}</span>
                    <Select
                      value={accountMap[platform] || ""}
                      onValueChange={(v) => setAccountMap((prev) => ({ ...prev, [platform]: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {platformAccounts.map((a: any) => (
                          <SelectItem key={a._id} value={a._id}>
                            {a.displayName || a.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm font-medium">
                {posts.filter((p) => p.status === "ready" || p.status === "draft").length} posts
                will be scheduled across {durationDays} days
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Starting {new Date(startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={scheduleCampaign.isPending || Object.keys(accountMap).length === 0}
                className="flex-1"
              >
                {scheduleCampaign.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scheduling...</>
                ) : (
                  <><Calendar className="mr-2 h-4 w-4" />Schedule Campaign</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
