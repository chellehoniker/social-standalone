"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAISettings, useUpdateAISettings } from "@/hooks/use-ai-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bot, Key, Image as ImageIcon, Save } from "lucide-react";

const IMAGE_MODELS = [
  { value: "mystic", label: "Mystic (Ultra-realistic)" },
  { value: "nano-banana", label: "Nano Banana (Fast, high quality)" },
  { value: "flux-2-pro", label: "Flux 2 Pro (Professional)" },
  { value: "flux-kontext-pro", label: "Flux Kontext Pro (Context-aware)" },
  { value: "seedream-4", label: "Seedream 4 (Fast)" },
  { value: "ideogram", label: "Ideogram (Text-in-image)" },
];

const VIDEO_MODELS = [
  { value: "kling-o1-pro", label: "Kling O1 Pro (Best quality)" },
  { value: "kling-o1-std", label: "Kling O1 Standard (Faster)" },
  { value: "kling-elements-pro", label: "Kling Elements Pro" },
  { value: "kling-elements-std", label: "Kling Elements Standard" },
];

export function AISettingsSection() {
  const { data: settings, isLoading } = useAISettings();
  const updateMutation = useUpdateAISettings();

  const [aiEnabled, setAiEnabled] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [freepikKey, setFreepikKey] = useState("");
  const [preferredProvider, setPreferredProvider] = useState("openai");
  const [imageModel, setImageModel] = useState("mystic");
  const [videoModel, setVideoModel] = useState("kling-o1-pro");
  const [imageStylePrompt, setImageStylePrompt] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setAiEnabled(settings.ai_enabled);
      setOpenaiKey(settings.openai_key || "");
      setAnthropicKey(settings.anthropic_key || "");
      setGeminiKey(settings.gemini_key || "");
      setFreepikKey(settings.freepik_key || "");
      setPreferredProvider(settings.preferred_ai_provider);
      setImageModel(settings.freepik_image_model);
      setVideoModel(settings.freepik_video_model);
      setImageStylePrompt(settings.image_style_prompt || "");
      setIsDirty(false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        ai_enabled: aiEnabled,
        openai_key: openaiKey || null,
        anthropic_key: anthropicKey || null,
        gemini_key: geminiKey || null,
        freepik_key: freepikKey || null,
        preferred_ai_provider: preferredProvider as "openai" | "anthropic" | "gemini",
        freepik_image_model: imageModel,
        freepik_video_model: videoModel,
        image_style_prompt: imageStylePrompt || null,
      });
      toast.success("AI settings saved");
      setIsDirty(false);
    } catch {
      toast.error("Failed to save AI settings");
    }
  };

  const markDirty = () => setIsDirty(true);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          AI Configuration
        </CardTitle>
        <CardDescription>
          Configure AI providers for campaign creation and content generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <div>
            <Label className="text-sm font-medium">Enable AI Features</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unlock the AI campaign creation wizard
            </p>
          </div>
          <Switch
            checked={aiEnabled}
            onCheckedChange={(v) => { setAiEnabled(v); markDirty(); }}
          />
        </div>

        {aiEnabled && (
          <>
            {/* AI Provider Keys */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">AI Provider Keys</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Add at least one AI provider key. Keys are encrypted and stored securely.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">OpenAI API Key</Label>
                  <Input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => { setOpenaiKey(e.target.value); markDirty(); }}
                    placeholder="sk-..."
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Anthropic API Key</Label>
                  <Input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => { setAnthropicKey(e.target.value); markDirty(); }}
                    placeholder="sk-ant-..."
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Google Gemini API Key</Label>
                  <Input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => { setGeminiKey(e.target.value); markDirty(); }}
                    placeholder="AI..."
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Preferred AI Provider</Label>
                <Select value={preferredProvider} onValueChange={(v) => { setPreferredProvider(v); markDirty(); }}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="gemini">Google (Gemini)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* FreePik Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">FreePik Settings</Label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">FreePik API Key</Label>
                <Input
                  type="password"
                  value={freepikKey}
                  onChange={(e) => { setFreepikKey(e.target.value); markDirty(); }}
                  placeholder="fpk-..."
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Image Model</Label>
                  <Select value={imageModel} onValueChange={(v) => { setImageModel(v); markDirty(); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Video Model</Label>
                  <Select value={videoModel} onValueChange={(v) => { setVideoModel(v); markDirty(); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Image Style Prompt</Label>
                <Textarea
                  value={imageStylePrompt}
                  onChange={(e) => { setImageStylePrompt(e.target.value); markDirty(); }}
                  placeholder="e.g., flat illustration, warm colors, bookish aesthetic, minimal background..."
                  rows={3}
                  className="resize-none text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  This style description is appended to every image generation prompt.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save AI Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
