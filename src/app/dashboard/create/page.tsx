"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAccounts, useQueuePreview } from "@/hooks";
import { fetchWithProfile } from "@/lib/api/fetch-with-profile";
import { useAISettings } from "@/hooks/use-ai-settings";
import {
  useCreateCampaign,
  useGeneratePlan,
  useCampaigns,
  useCampaign,
  useUpdateCampaignPost,
  useScheduleCampaign,
} from "@/hooks/use-campaigns";
import { useAppStore } from "@/stores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  FolderOpen,
  Trash2,
  Clock,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Platform } from "@/lib/late-api";
import { PLATFORM_NAMES } from "@/lib/late-api";

type Step = "list" | "objective" | "guides" | "generate" | "review" | "media" | "finalize" | "schedule";
const WIZARD_STEPS: Step[] = ["objective", "guides", "generate", "review", "media", "finalize", "schedule"];

const STEP_LABELS: Record<Step, string> = {
  list: "Campaigns",
  objective: "Objective",
  guides: "Review Guides",
  generate: "Generate Plan",
  review: "Review & Edit",
  media: "Generate Media",
  finalize: "Finalize",
  schedule: "Schedule",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  generating: { label: "Generating...", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300" },
  review: { label: "In Review", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  scheduled: { label: "Scheduled", className: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300" },
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { timezone } = useAppStore();
  const { data: accountsData } = useAccounts();
  const { data: aiSettings } = useAISettings();
  const { data: campaignsData, refetch: refetchCampaigns } = useCampaigns();
  const accounts = (accountsData?.accounts || []) as any[];

  // Resume from URL param or start at list
  const resumeId = searchParams.get("id");
  const [step, setStep] = useState<Step>(resumeId ? "review" : "list");
  const [campaignId, setCampaignId] = useState<string | null>(resumeId);

  // Step 1: Objective
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [contentMix, setContentMix] = useState<"mostly_images" | "mixed" | "images_only" | "videos_only" | "user_decides">("mixed");

  // Step 6: Schedule
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [scheduleMode, setScheduleMode] = useState<"spread" | "queue" | "custom">("spread");
  const [postTimes, setPostTimes] = useState(["10:00"]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});

  // Lightbox (image or video)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxVideoUrl, setLightboxVideoUrl] = useState<string | null>(null);
  const [lightboxLabel, setLightboxLabel] = useState("");

  const openLightbox = (imageUrl: string, label: string, videoUrl?: string) => {
    setLightboxUrl(imageUrl);
    setLightboxVideoUrl(videoUrl || null);
    setLightboxLabel(label);
  };
  const closeLightbox = () => {
    setLightboxUrl(null);
    setLightboxVideoUrl(null);
    setLightboxLabel("");
  };

  // Media generation
  const [mediaProgress, setMediaProgress] = useState<{
    total: number; completed: number; failed: number; inProgress: number; isRunning: boolean;
    posts: Array<{ id: string; day_number: number; status: string; media_urls: Record<string, string> }>;
  } | null>(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);

  // Mutations
  const createCampaign = useCreateCampaign();
  const generatePlan = useGeneratePlan();
  const scheduleCampaign = useScheduleCampaign();
  const updatePost = useUpdateCampaignPost();
  const { data: campaignData, refetch: refetchCampaign } = useCampaign(campaignId || "");
  const { data: queueData } = useQueuePreview(durationDays);

  const campaign = campaignData?.campaign;
  const posts = campaignData?.posts || [];
  const plan = campaign?.post_plan || [];

  // When resuming, populate form state from campaign
  useEffect(() => {
    if (campaign && !name) {
      setName(campaign.name);
      setObjective(campaign.objective);
      setDurationDays(campaign.duration_days);
      const plats = (campaign.platforms || []).map((p: any) => typeof p === "string" ? p : p.platform);
      setSelectedPlatforms(plats);
      updateAccountMap(plats);

      // Jump to appropriate step based on status
      if (campaign.status === "scheduled" || campaign.status === "active") {
        setStep("schedule");
      } else if (campaign.status === "review" && posts.some((p) => Object.keys(p.media_urls || {}).length > 0)) {
        setStep("media");
      } else if (campaign.status === "review") {
        setStep("review");
      } else if (campaign.status === "generating") {
        setStep("generate");
      }
    }
  }, [campaign, posts]);

  const wizardStepIndex = WIZARD_STEPS.indexOf(step);
  const isInWizard = step !== "list";

  const goNext = () => {
    const next = WIZARD_STEPS[wizardStepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    if (wizardStepIndex <= 0) {
      setStep("list");
      return;
    }
    const prev = WIZARD_STEPS[wizardStepIndex - 1];
    if (prev) setStep(prev);
  };

  const updateAccountMap = (platforms: string[]) => {
    const map: Record<string, string> = {};
    for (const platform of platforms) {
      const account = accounts.find((a: any) => a.platform === platform);
      if (account) map[platform] = account._id;
    }
    setAccountMap(map);
  };

  const startNewCampaign = () => {
    setCampaignId(null);
    setName("");
    setObjective("");
    setDurationDays(30);
    setSelectedPlatforms([]);
    setAccountMap({});
    setStep("objective");
  };

  const resumeCampaign = (id: string) => {
    setCampaignId(id);
    setName(""); // Will be populated by useEffect
    setStep("review"); // Will be adjusted by useEffect
    router.replace(`/dashboard/create?id=${id}`);
  };

  const deleteCampaign = async (id: string) => {
    try {
      await fetchWithProfile(`/api/campaigns/${id}`, { method: "DELETE" });
      refetchCampaigns();
      toast.success("Campaign deleted");
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  // ── Step 1: Create Campaign ──
  const handleCreateCampaign = async () => {
    try {
      const result = await createCampaign.mutateAsync({
        name,
        objective,
        duration_days: durationDays,
        platforms: selectedPlatforms,
        content_mix: contentMix,
      });
      setCampaignId(result.campaign.id);
      updateAccountMap(selectedPlatforms);
      router.replace(`/dashboard/create?id=${result.campaign.id}`);
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
  const pollMediaStatus = useCallback(async () => {
    if (!campaignId) return null;
    try {
      const res = await fetchWithProfile(`/api/campaigns/${campaignId}/generate-media`);
      if (res.ok) {
        const data = await res.json();
        setMediaProgress(data);
        return data;
      }
    } catch { /* ignore */ }
    return null;
  }, [campaignId]);

  useEffect(() => {
    if (!isGeneratingMedia || !campaignId) return;
    const interval = setInterval(async () => {
      const data = await pollMediaStatus();
      if (data && !data.isRunning && data.inProgress === 0) {
        setIsGeneratingMedia(false);
        await refetchCampaign();
        toast.success(`Media generation complete: ${data.completed} succeeded, ${data.failed} failed`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isGeneratingMedia, campaignId, pollMediaStatus, refetchCampaign]);

  const handleGenerateMedia = async () => {
    if (!campaignId) return;
    try {
      const res = await fetchWithProfile(`/api/campaigns/${campaignId}/generate-media`, { method: "POST" });
      if (res.ok) {
        setIsGeneratingMedia(true);
        await pollMediaStatus();
      } else {
        toast.error("Failed to start media generation");
      }
    } catch {
      toast.error("Failed to start media generation");
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
        scheduleMode,
        accountMap,
        postTimes,
      });
      toast.success(`Scheduled ${result.scheduled} posts!`);
      router.push("/dashboard/calendar");
    } catch {
      toast.error("Failed to schedule campaign");
    }
  };

  // Regenerate a single post's media
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | null>(null);
  const regeneratePostMedia = async (postId: string) => {
    if (!campaignId) return;
    setRegeneratingPostId(postId);
    try {
      // Reset this single post to draft so it gets re-processed
      await fetchWithProfile(`/api/campaigns/${campaignId}/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft", media_urls: {}, music_url: null }),
      });
      // Kick off generation — only draft/failed posts are processed
      await fetchWithProfile(`/api/campaigns/${campaignId}/generate-media`, { method: "POST" });
      // Poll until this specific post is done
      const pollSingle = setInterval(async () => {
        const data = await pollMediaStatus();
        if (data) {
          const thisPost = data.posts.find((p: any) => p.id === postId);
          if (thisPost && thisPost.status !== "generating" && thisPost.status !== "draft") {
            clearInterval(pollSingle);
            setRegeneratingPostId(null);
            await refetchCampaign();
            if (thisPost.status === "ready") {
              toast.success("Image regenerated");
            } else {
              toast.error("Regeneration failed — try editing the prompt");
            }
          }
        }
      }, 5000);
    } catch {
      toast.error("Failed to regenerate");
      setRegeneratingPostId(null);
    }
  };

  // Content type switching per day
  const changeContentType = (dayNumber: number, newType: "image" | "carousel" | "video") => {
    if (!campaignId) return;
    const updatedPlan = [...plan];
    const idx = updatedPlan.findIndex((d: any) => d.day === dayNumber);
    if (idx < 0) return;

    const day = { ...updatedPlan[idx], contentType: newType };

    if (newType === "carousel" && !day.imagePrompts?.length) {
      day.imagePrompts = [
        day.imagePrompt,
        `${day.theme} - detail view`,
        `${day.theme} - closer look`,
        `${day.theme} - call to action`,
      ];
    }

    if (newType === "video" && !day.videoPrompt) {
      day.videoPrompt = "Gentle camera movement, cinematic feel";
      day.musicPrompt = `Ambient, warm, matching the mood of: ${day.theme}`;
    }

    if (newType === "image") {
      delete day.imagePrompts;
      delete day.videoPrompt;
      delete day.musicPrompt;
    }

    updatedPlan[idx] = day;
    fetchWithProfile(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_plan: updatedPlan }),
    }).then(() => refetchCampaign());
  };

  const MOTION_PRESETS = [
    { value: "gentle_zoom", label: "Gentle Zoom", prompt: "Slow, smooth zoom into the subject" },
    { value: "pan_right", label: "Pan Right", prompt: "Smooth horizontal pan from left to right" },
    { value: "cinematic", label: "Cinematic", prompt: "Cinematic slow zoom with slight camera movement" },
    { value: "dynamic", label: "Dynamic", prompt: "Energetic camera movement with quick transitions" },
    { value: "custom", label: "Custom", prompt: "" },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {isInWizard ? (campaign?.name || "New Campaign") : "Campaigns"}
          </h1>
          <p className="text-muted-foreground">
            {isInWizard ? "AI-powered campaign builder" : "Create and manage AI campaigns"}
          </p>
        </div>
        {step === "list" && (
          <Button onClick={startNewCampaign}>
            <Plus className="mr-2 h-4 w-4" /> New Campaign
          </Button>
        )}
        {isInWizard && (
          <Button variant="ghost" size="sm" onClick={() => { setStep("list"); refetchCampaigns(); }}>
            <FolderOpen className="mr-2 h-4 w-4" /> All Campaigns
          </Button>
        )}
      </div>

      {/* Step indicator (wizard only) */}
      {isInWizard && (
        <div className="flex gap-1">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i <= wizardStepIndex ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[10px] ${s === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {STEP_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ══════ CAMPAIGN LIST ══════ */}
      {step === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4" />
              Your Campaigns
            </CardTitle>
            <CardDescription>
              Resume an in-progress campaign or start a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!campaignsData?.campaigns?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-sm font-medium">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first AI-powered campaign to get started.
                </p>
                <Button className="mt-6" onClick={startNewCampaign}>
                  <Plus className="mr-2 h-4 w-4" /> New Campaign
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {campaignsData.campaigns.map((c: any) => {
                  const status = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4">
                      <button
                        type="button"
                        className="flex-1 text-left min-w-0"
                        onClick={() => resumeCampaign(c.id)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate">{c.name}</h4>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {c.duration_days} days
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCampaign(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 1: OBJECTIVE ══════ */}
      {step === "objective" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Campaign Objective
            </CardTitle>
            <CardDescription>What do you want to achieve?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Spring Book Launch" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objective</Label>
              <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g., Promote my new cozy mystery launching April 1st..." rows={4} className="resize-none text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration</Label>
              <Select value={String(durationDays)} onValueChange={(v) => setDurationDays(Number(v))}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 post</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
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
                  <label key={platform} className="flex items-center gap-2 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-accent/50">
                    <Checkbox
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={(checked) => setSelectedPlatforms((prev) => checked ? [...prev, platform] : prev.filter((p) => p !== platform))}
                    />
                    <span className="text-sm">{PLATFORM_NAMES[platform as Platform] || platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Content Mix */}
            <div className="space-y-2">
              <Label className="text-xs">Content Mix</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "images_only" as const, label: "Images Only", desc: "Simple single-image posts" },
                  { value: "mostly_images" as const, label: "Mostly Images", desc: "Images with some carousels" },
                  { value: "mixed" as const, label: "Full Mix", desc: "Images, carousels, and videos" },
                  { value: "videos_only" as const, label: "Videos Only", desc: "Every post is a video with music" },
                  { value: "user_decides" as const, label: "I'll Choose", desc: "All images — you change per day" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setContentMix(opt.value)}
                    className={`rounded-lg border p-2.5 text-left transition-colors ${
                      contentMix === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" disabled={!name || !objective || selectedPlatforms.length === 0 || createCampaign.isPending} onClick={handleCreateCampaign}>
              {createCampaign.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <>Next: Review Guides <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 2: REVIEW GUIDES ══════ */}
      {step === "guides" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Your Guides</CardTitle>
            <CardDescription>These guides inform the AI when generating content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {["prose_guide", "brand_guide", "copywriting_guide", "social_media_guide"].map((key) => {
              const labels: Record<string, string> = { prose_guide: "Prose Guide", brand_guide: "Brand Guide", copywriting_guide: "Copywriting Guide", social_media_guide: "Social Media Guide" };
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{labels[key]}</Label>
                    {aiSettings?.[key as keyof typeof aiSettings] ? (
                      <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" />Set</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Not set</Badge>
                    )}
                  </div>
                  {aiSettings?.[key as keyof typeof aiSettings] && (
                    <p className="text-xs text-muted-foreground line-clamp-2 rounded bg-muted p-2">
                      {String(aiSettings[key as keyof typeof aiSettings]).slice(0, 150)}...
                    </p>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Edit guides in <a href="/dashboard/settings" className="text-primary underline">Settings</a>.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={goNext} className="flex-1">Next: Generate <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 3: GENERATE PLAN ══════ */}
      {step === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />Generate Campaign Plan</CardTitle>
            <CardDescription>The AI will create {durationDays} days of content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <p><strong>Campaign:</strong> {name || campaign?.name}</p>
              <p><strong>Objective:</strong> {objective || campaign?.objective}</p>
              <p><strong>Duration:</strong> {durationDays} days</p>
              <p><strong>Platforms:</strong> {selectedPlatforms.map((p) => PLATFORM_NAMES[p as Platform] || p).join(", ")}</p>
              <p><strong>AI Provider:</strong> {aiSettings?.preferred_ai_provider || "openai"}</p>
            </div>
            {generatePlan.isPending ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium">Generating your campaign plan...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take 30-60 seconds</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={handleGenerate} className="flex-1"><Sparkles className="mr-2 h-4 w-4" /> Generate Plan</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 4: REVIEW & EDIT ══════ */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review & Edit</CardTitle>
            <CardDescription>Edit captions and prompts for each day. Changes save automatically.</CardDescription>
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
                          <Badge variant="outline" className="text-xs">Day {post.day_number}</Badge>
                          <span className="text-sm font-medium truncate">{dayPlan?.theme || ""}</span>
                        </div>
                        <Select
                          value={dayPlan?.contentType || "image"}
                          onValueChange={(v) => changeContentType(post.day_number, v as "image" | "carousel" | "video")}
                        >
                          <SelectTrigger className="h-7 w-28 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="carousel">Carousel</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
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
                                  data: { caption_variants: { ...post.caption_variants, [platform]: e.target.value } },
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
                          <Textarea
                            defaultValue={dayPlan.imagePrompt}
                            rows={2}
                            className="text-xs resize-none"
                            onBlur={(e) => {
                              if (e.target.value !== dayPlan.imagePrompt && campaignId) {
                                const updatedPlan = [...plan];
                                const idx = updatedPlan.findIndex((d: any) => d.day === post.day_number);
                                if (idx >= 0) {
                                  updatedPlan[idx] = { ...updatedPlan[idx], imagePrompt: e.target.value };
                                  fetchWithProfile(`/api/campaigns/${campaignId}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ post_plan: updatedPlan }),
                                  });
                                }
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Carousel slides */}
                      {dayPlan?.contentType === "carousel" && dayPlan?.imagePrompts?.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> Carousel Slides ({dayPlan.imagePrompts.length})
                          </Label>
                          <p className="text-[10px] text-muted-foreground">
                            Each slide tells part of the story. Edit the visual description for each.
                          </p>
                          {dayPlan.imagePrompts.map((slidePrompt: string, slideIdx: number) => (
                            <div key={slideIdx} className="flex gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-[10px] font-medium shrink-0 mt-1">
                                {slideIdx + 1}
                              </div>
                              <Textarea
                                defaultValue={slidePrompt}
                                rows={2}
                                className="text-xs resize-none flex-1"
                                placeholder={`Slide ${slideIdx + 1}`}
                                onBlur={(e) => {
                                  if (e.target.value !== slidePrompt && campaignId) {
                                    const updatedPlan = [...plan];
                                    const idx = updatedPlan.findIndex((d: any) => d.day === post.day_number);
                                    if (idx >= 0) {
                                      const updatedSlides = [...(updatedPlan[idx].imagePrompts || [])];
                                      updatedSlides[slideIdx] = e.target.value;
                                      updatedPlan[idx] = { ...updatedPlan[idx], imagePrompts: updatedSlides };
                                      fetchWithProfile(`/api/campaigns/${campaignId}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ post_plan: updatedPlan }),
                                      });
                                    }
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Video motion preset */}
                      {dayPlan?.contentType === "video" && (
                        <div className="space-y-2">
                          <Label className="text-[10px] text-muted-foreground uppercase">Camera Motion</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {MOTION_PRESETS.map((preset) => {
                              const isSelected = dayPlan.videoPrompt === preset.prompt ||
                                (preset.value === "custom" && !MOTION_PRESETS.slice(0, -1).some((p) => p.prompt === dayPlan.videoPrompt));
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => {
                                    if (preset.value === "custom") return; // handled by textarea below
                                    const updatedPlan = [...plan];
                                    const idx = updatedPlan.findIndex((d: any) => d.day === post.day_number);
                                    if (idx >= 0) {
                                      updatedPlan[idx] = { ...updatedPlan[idx], videoPrompt: preset.prompt };
                                      fetchWithProfile(`/api/campaigns/${campaignId}`, {
                                        method: "PATCH", headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ post_plan: updatedPlan }),
                                      });
                                    }
                                  }}
                                  className={`rounded border p-1.5 text-[10px] text-left transition-colors ${
                                    isSelected ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-accent/50"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                          {/* Custom motion prompt textarea */}
                          {!MOTION_PRESETS.slice(0, -1).some((p) => p.prompt === dayPlan.videoPrompt) && (
                            <Textarea
                              defaultValue={dayPlan.videoPrompt || ""}
                              rows={2}
                              className="text-xs resize-none"
                              placeholder="Describe the camera motion..."
                              onBlur={(e) => {
                                if (e.target.value !== dayPlan.videoPrompt && campaignId) {
                                  const updatedPlan = [...plan];
                                  const idx = updatedPlan.findIndex((d: any) => d.day === post.day_number);
                                  if (idx >= 0) {
                                    updatedPlan[idx] = { ...updatedPlan[idx], videoPrompt: e.target.value };
                                    fetchWithProfile(`/api/campaigns/${campaignId}`, {
                                      method: "PATCH", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ post_plan: updatedPlan }),
                                    });
                                  }
                                }
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Music prompt */}
                      {dayPlan?.musicPrompt && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">Music Mood</Label>
                          <Textarea
                            defaultValue={dayPlan.musicPrompt}
                            rows={1}
                            className="text-xs resize-none"
                            onBlur={(e) => {
                              if (e.target.value !== dayPlan.musicPrompt && campaignId) {
                                const updatedPlan = [...plan];
                                const idx = updatedPlan.findIndex((d: any) => d.day === post.day_number);
                                if (idx >= 0) {
                                  updatedPlan[idx] = { ...updatedPlan[idx], musicPrompt: e.target.value };
                                  fetchWithProfile(`/api/campaigns/${campaignId}`, {
                                    method: "PATCH", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ post_plan: updatedPlan }),
                                  });
                                }
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Show generated media if it exists */}
                      {Object.keys(post.media_urls || {}).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(post.media_urls).map(([key, url]) => (
                            <div key={key} className="h-16 w-16 rounded overflow-hidden bg-muted">
                              <img src={url as string} alt={key} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={goBack} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={goNext} className="flex-1">Next: Generate Media <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 5: GENERATE MEDIA ══════ */}
      {step === "media" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" />Generate Media</CardTitle>
            <CardDescription>Generate images, carousels, and videos for your campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isGeneratingMedia ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {mediaProgress ? `${mediaProgress.completed} of ${mediaProgress.total} complete` : "Starting..."}
                    </span>
                    {mediaProgress && mediaProgress.failed > 0 && (
                      <span className="text-destructive">{mediaProgress.failed} failed</span>
                    )}
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: mediaProgress
                          ? `${Math.round(((mediaProgress.completed + mediaProgress.failed) / Math.max(mediaProgress.total, 1)) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {mediaProgress && mediaProgress.total > 0
                      ? `~${Math.max(1, Math.round((mediaProgress.total - mediaProgress.completed - mediaProgress.failed) * 0.7))} min remaining`
                      : "Preparing..."}
                  </p>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {(mediaProgress?.posts || posts).map((post) => {
                    const urls = post.media_urls || {};
                    // Prefer video_still for display, then first non-video URL, then any URL
                    const displayUrl = (urls.video_still || Object.entries(urls).find(([k]) => !k.includes("video"))?.[1] || Object.values(urls)[0]) as string;
                    const isVideo = !!urls.video;
                    return (
                      <button
                        key={post.id}
                        type="button"
                        disabled={!displayUrl}
                        onClick={() => { if (displayUrl) openLightbox(displayUrl, `Day ${post.day_number}${isVideo ? " (Video)" : ""}`, isVideo ? (urls.video as string) : undefined); }}
                        className={`aspect-square rounded-lg overflow-hidden flex items-center justify-center text-xs font-medium transition-transform relative ${
                          post.status === "ready" ? "bg-green-100 dark:bg-green-950/30 hover:scale-105 cursor-pointer" : post.status === "failed" ? "bg-red-100 dark:bg-red-950/30" : "bg-muted animate-pulse"
                        }`}
                      >
                        {displayUrl ? <img src={displayUrl} alt={`Day ${post.day_number}`} className="w-full h-full object-cover" /> : post.day_number}
                        {isVideo && displayUrl && <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded">▶</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {posts.some((p) => Object.keys(p.media_urls || {}).length > 0) && (
                  <div className="grid grid-cols-5 gap-2">
                    {posts.map((post) => {
                      const urls = post.media_urls || {};
                      const displayUrl = (urls.video_still || Object.entries(urls).find(([k]) => !k.includes("video"))?.[1] || Object.values(urls)[0]) as string;
                      const isVideo = !!urls.video;
                      return (
                        <button
                          key={post.id}
                          type="button"
                          disabled={!displayUrl}
                          onClick={() => { if (displayUrl) openLightbox(displayUrl, `Day ${post.day_number}`, isVideo ? (urls.video as string) : undefined); }}
                          className="aspect-square rounded-lg overflow-hidden bg-muted relative hover:scale-105 transition-transform cursor-pointer"
                        >
                          {displayUrl ? <img src={displayUrl} alt={`Day ${post.day_number}`} className="w-full h-full object-cover" /> : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{post.day_number}</div>
                          )}
                          {isVideo && displayUrl && <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded">▶</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={goBack} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={handleGenerateMedia} className="flex-1"><ImageIcon className="mr-2 h-4 w-4" /> Generate Media</Button>
                  {posts.some((p) => Object.keys(p.media_urls || {}).length > 0) && (
                    <Button variant="outline" onClick={goNext}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 6: FINALIZE ══════ */}
      {step === "finalize" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finalize Campaign
            </CardTitle>
            <CardDescription>
              Review every post before scheduling. Edit captions, regenerate images, and make final adjustments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-6 pr-4">
                {posts.map((post) => {
                  const dayPlan = plan.find((d: any) => d.day === post.day_number);
                  const urls = post.media_urls || {};
                  const isVideo = !!urls.video;
                  const isCarousel = dayPlan?.contentType === "carousel";
                  const displayUrl = (urls.video_still || Object.entries(urls).find(([k]) => !k.includes("video"))?.[1] || Object.values(urls)[0]) as string;
                  const slideUrls = Object.entries(urls)
                    .filter(([k]) => k.startsWith("slide_"))
                    .sort(([a], [b]) => parseInt(a.replace("slide_", "")) - parseInt(b.replace("slide_", "")))
                    .map(([, url]) => url as string);

                  return (
                    <div key={post.id} className="rounded-lg border border-border overflow-hidden">
                      {/* Day header */}
                      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Day {post.day_number}</Badge>
                          <span className="text-sm font-medium truncate">{dayPlan?.theme || ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {isVideo ? "Video" : isCarousel ? `Carousel (${slideUrls.length} slides)` : "Image"}
                          </Badge>
                          {post.status === "failed" && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Media preview */}
                        {isCarousel && slideUrls.length > 0 ? (
                          <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase">Carousel Slides</Label>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {slideUrls.map((url, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => openLightbox(url, `Day ${post.day_number} — Slide ${i + 1}`)}
                                  className="shrink-0 w-32 h-40 rounded-lg overflow-hidden bg-muted hover:scale-105 transition-transform cursor-pointer relative"
                                >
                                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">{i + 1}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : displayUrl ? (
                          <button
                            type="button"
                            onClick={() => openLightbox(displayUrl, `Day ${post.day_number}${isVideo ? " (Video)" : ""}`, isVideo ? (urls.video as string) : undefined)}
                            className="w-full max-h-64 rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity cursor-pointer relative"
                          >
                            <img src={displayUrl} alt={`Day ${post.day_number}`} className="w-full h-full object-cover" />
                            {isVideo && <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">▶ Play Video</span>}
                          </button>
                        ) : (
                          <div className="h-32 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            No media generated
                          </div>
                        )}

                        {/* Regenerate button */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={regeneratingPostId === post.id || isGeneratingMedia}
                            onClick={() => regeneratePostMedia(post.id)}
                          >
                            {regeneratingPostId === post.id ? (
                              <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Regenerating...</>
                            ) : (
                              <><Sparkles className="mr-1 h-3 w-3" />Regenerate Media</>
                            )}
                          </Button>
                        </div>

                        {/* Captions — editable per platform */}
                        <div className="space-y-3">
                          <Label className="text-[10px] text-muted-foreground uppercase">Captions</Label>
                          {Object.entries(post.caption_variants || {}).map(([platform, caption]) => (
                            <div key={platform} className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">
                                {PLATFORM_NAMES[platform as Platform] || platform}
                              </Label>
                              <Textarea
                                defaultValue={caption as string}
                                rows={3}
                                className="text-xs resize-y"
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
                        </div>
                      </div>
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
                Next: Schedule <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ STEP 7: SCHEDULE ══════ */}
      {step === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Schedule Campaign</CardTitle>
            <CardDescription>Choose how and when to post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Scheduling Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "spread" as const, label: "Spread Evenly", desc: "One post per day" },
                  { value: "queue" as const, label: "Use My Queue", desc: "Fill queue slots" },
                  { value: "custom" as const, label: "Custom Times", desc: "Multiple daily times" },
                ]).map((mode) => (
                  <button
                    key={mode.value} type="button"
                    onClick={() => setScheduleMode(mode.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${scheduleMode === mode.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}
                  >
                    <p className="text-xs font-medium">{mode.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {scheduleMode !== "queue" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-48" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Posting Times</Label>
                  {postTimes.map((time, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={time} onChange={(e) => { const u = [...postTimes]; u[i] = e.target.value; setPostTimes(u); }} className="h-8 w-32 text-xs" />
                      {postTimes.length > 1 && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPostTimes(postTimes.filter((_, j) => j !== i))}>Remove</Button>}
                    </div>
                  ))}
                  {scheduleMode === "custom" && postTimes.length < 5 && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setPostTimes([...postTimes, "14:00"])}>+ Add Time</Button>
                  )}
                </div>
              </>
            )}

            {scheduleMode === "queue" && queueData?.slots?.length ? (
              <div className="space-y-2">
                <Label className="text-xs">Your Queue Slots</Label>
                <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                  {(queueData.slots as string[]).slice(0, 10).map((slot: string, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span>{new Date(slot).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      <span className="text-muted-foreground">{new Date(slot).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : scheduleMode === "queue" ? (
              <p className="text-xs text-muted-foreground bg-muted rounded p-4 text-center">No queue slots configured. Set up your queue first.</p>
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs">Account Mapping</Label>
              {(selectedPlatforms.length ? selectedPlatforms : (campaign?.platforms || []).map((p: any) => typeof p === "string" ? p : p.platform)).map((platform: string) => {
                const platformAccounts = accounts.filter((a: any) => a.platform === platform);
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-xs w-24">{PLATFORM_NAMES[platform as Platform] || platform}</span>
                    <Select value={accountMap[platform] || ""} onValueChange={(v) => setAccountMap((prev) => ({ ...prev, [platform]: v }))}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {platformAccounts.map((a: any) => (<SelectItem key={a._id} value={a._id}>{a.displayName || a.username}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm font-medium">
                {posts.filter((p) => ["ready", "draft"].includes(p.status)).length} posts will be scheduled
                {scheduleMode === "queue" ? " via your queue" : ` across ${durationDays} days`}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={handleSchedule} disabled={scheduleCampaign.isPending || Object.keys(accountMap).length === 0} className="flex-1">
                {scheduleCampaign.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scheduling...</> : <><Calendar className="mr-2 h-4 w-4" />Schedule Campaign</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Image / Video Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{lightboxLabel}</DialogTitle>
          <div className="relative">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-medium">{lightboxLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeLightbox}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {lightboxVideoUrl ? (
              <video
                src={lightboxVideoUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
                poster={lightboxUrl || undefined}
              />
            ) : lightboxUrl ? (
              <img
                src={lightboxUrl}
                alt={lightboxLabel}
                className="w-full rounded-lg"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
