"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAISettings, useUpdateAISettings } from "@/hooks/use-ai-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BookOpen, Save } from "lucide-react";

const GUIDES = [
  {
    key: "prose_guide" as const,
    label: "Prose Guide",
    description: "Your writing style, tone, and voice preferences. How you want your content to sound.",
    placeholder: "e.g., Warm and conversational tone. Use short paragraphs. Avoid jargon. Write at a 6th grade reading level...",
  },
  {
    key: "brand_guide" as const,
    label: "Brand Guide",
    description: "Your brand identity, values, and personality. What makes your brand unique.",
    placeholder: "e.g., We're a cozy mystery publisher. Our brand is warm, inviting, and whimsical. We use book-related metaphors...",
  },
  {
    key: "copywriting_guide" as const,
    label: "Copywriting Guide",
    description: "Principles for persuasive copy, calls to action, and engagement strategies.",
    placeholder: "e.g., Always lead with a hook. Use questions to engage. Include a clear CTA. Keep it under 150 words for social...",
  },
  {
    key: "social_media_guide" as const,
    label: "Social Media Guide",
    description: "Platform-specific guidelines, hashtag strategy, posting frequency, and content themes.",
    placeholder: "e.g., Instagram: use 5-10 hashtags, mix of niche and broad. TikTok: hook in first 3 seconds. LinkedIn: professional but personable...",
  },
];

export function GuidesSection() {
  const { data: settings, isLoading } = useAISettings();
  const updateMutation = useUpdateAISettings();

  const [guides, setGuides] = useState<Record<string, string>>({
    prose_guide: "",
    brand_guide: "",
    copywriting_guide: "",
    social_media_guide: "",
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setGuides({
        prose_guide: settings.prose_guide || "",
        brand_guide: settings.brand_guide || "",
        copywriting_guide: settings.copywriting_guide || "",
        social_media_guide: settings.social_media_guide || "",
      });
      setIsDirty(false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        prose_guide: guides.prose_guide || null,
        brand_guide: guides.brand_guide || null,
        copywriting_guide: guides.copywriting_guide || null,
        social_media_guide: guides.social_media_guide || null,
      });
      toast.success("Guides saved");
      setIsDirty(false);
    } catch {
      toast.error("Failed to save guides");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings?.ai_enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Content Guides
        </CardTitle>
        <CardDescription>
          These guides inform the AI when generating campaign content. The more
          detail you provide, the better the output will match your style.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {GUIDES.map((guide) => (
          <div key={guide.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">{guide.label}</Label>
              <span className="text-[10px] text-muted-foreground">
                {guides[guide.key].length.toLocaleString()} chars
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{guide.description}</p>
            <Textarea
              value={guides[guide.key]}
              onChange={(e) => {
                setGuides((prev) => ({ ...prev, [guide.key]: e.target.value }));
                setIsDirty(true);
              }}
              placeholder={guide.placeholder}
              rows={5}
              className="resize-y text-xs"
            />
          </div>
        ))}

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
              Save Guides
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
