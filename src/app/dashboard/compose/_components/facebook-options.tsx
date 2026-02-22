"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FacebookPlatformData } from "@/lib/late-api/types";

interface FacebookOptionsProps {
  accountId: string;
  data: FacebookPlatformData;
  onChange: (data: FacebookPlatformData) => void;
  hasVideo: boolean;
}

export function FacebookOptions({
  accountId,
  data,
  onChange,
  hasVideo,
}: FacebookOptionsProps) {
  const isFeedPost = !data.contentType;
  const isReel = data.contentType === "reel";

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Facebook Options
      </p>

      <div className="space-y-2">
        <Label className="text-xs">Post type</Label>
        <RadioGroup
          value={data.contentType ?? "feed"}
          onValueChange={(val) => {
            const contentType =
              val === "feed" ? undefined : (val as "story" | "reel");
            const updated: FacebookPlatformData = {
              ...data,
              contentType,
            };
            // Clear firstComment when switching away from feed
            if (contentType) {
              delete updated.firstComment;
            }
            // Clear title when switching away from reel
            if (contentType !== "reel") {
              delete updated.title;
            }
            onChange(updated);
          }}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="feed" id={`${accountId}-fb-feed`} />
            <Label htmlFor={`${accountId}-fb-feed`} className="text-xs">
              Feed Post
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="story" id={`${accountId}-fb-story`} />
            <Label htmlFor={`${accountId}-fb-story`} className="text-xs">
              Story
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem
              value="reel"
              id={`${accountId}-fb-reel`}
              disabled={!hasVideo}
            />
            <Label
              htmlFor={`${accountId}-fb-reel`}
              className={`text-xs ${!hasVideo ? "text-muted-foreground" : ""}`}
            >
              Reel {!hasVideo && "(requires video)"}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {isReel && (
        <div className="space-y-1.5">
          <Label className="text-xs">Reel title (optional)</Label>
          <Input
            value={data.title ?? ""}
            onChange={(e) =>
              onChange({ ...data, title: e.target.value || undefined })
            }
            placeholder="Add a title for your reel..."
            className="h-8 text-xs"
          />
        </div>
      )}

      {isReel && !hasVideo && (
        <p className="text-xs text-destructive">
          Reels require a vertical video (9:16 ratio, 3-60 seconds)
        </p>
      )}

      {isFeedPost && (
        <div className="space-y-1.5">
          <Label className="text-xs">First comment (optional)</Label>
          <Textarea
            value={data.firstComment ?? ""}
            onChange={(e) =>
              onChange({
                ...data,
                firstComment: e.target.value || undefined,
              })
            }
            placeholder="Add a first comment..."
            rows={2}
            className="resize-none text-xs"
          />
        </div>
      )}
    </div>
  );
}
