"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TikTokPlatformData } from "@/lib/late-api/types";

interface TikTokOptionsProps {
  accountId: string;
  data: TikTokPlatformData;
  onChange: (data: TikTokPlatformData) => void;
  hasVideo: boolean;
  hasImages: boolean;
}

export function TikTokOptions({
  accountId,
  data,
  onChange,
  hasVideo,
  hasImages,
}: TikTokOptionsProps) {
  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        TikTok Options
      </p>

      {/* Draft vs Publish */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={`${accountId}-tt-draft`} className="text-xs">
            Send as draft
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Sends to your TikTok Inbox to review before publishing
          </p>
        </div>
        <Switch
          id={`${accountId}-tt-draft`}
          checked={data.draft ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...data, draft: checked })
          }
        />
      </div>

      {/* Privacy Level */}
      <div className="space-y-1.5">
        <Label className="text-xs">Who can view</Label>
        <Select
          value={data.privacyLevel ?? "PUBLIC_TO_EVERYONE"}
          onValueChange={(val) =>
            onChange({ ...data, privacyLevel: val as TikTokPlatformData["privacyLevel"] })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC_TO_EVERYONE">Everyone</SelectItem>
            <SelectItem value="MUTUAL_FOLLOW_FRIENDS">Friends</SelectItem>
            <SelectItem value="SELF_ONLY">Only me</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interaction toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${accountId}-tt-comments`} className="text-xs">
            Allow comments
          </Label>
          <Switch
            id={`${accountId}-tt-comments`}
            checked={data.allowComment ?? true}
            onCheckedChange={(checked) =>
              onChange({ ...data, allowComment: checked })
            }
          />
        </div>

        {hasVideo && (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${accountId}-tt-duet`} className="text-xs">
                Allow duets
              </Label>
              <Switch
                id={`${accountId}-tt-duet`}
                checked={data.allowDuet ?? true}
                onCheckedChange={(checked) =>
                  onChange({ ...data, allowDuet: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`${accountId}-tt-stitch`} className="text-xs">
                Allow stitches
              </Label>
              <Switch
                id={`${accountId}-tt-stitch`}
                checked={data.allowStitch ?? true}
                onCheckedChange={(checked) =>
                  onChange({ ...data, allowStitch: checked })
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Commercial content */}
      <div className="space-y-1.5">
        <Label className="text-xs">Commercial content</Label>
        <Select
          value={data.commercialContentType ?? "none"}
          onValueChange={(val) =>
            onChange({
              ...data,
              commercialContentType: val as TikTokPlatformData["commercialContentType"],
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="brand_organic">
              Brand organic (your own brand)
            </SelectItem>
            <SelectItem value="brand_content">
              Paid partnership
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Photo carousel: auto-add music */}
      {hasImages && !hasVideo && (
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor={`${accountId}-tt-music`} className="text-xs">
              Auto-add music
            </Label>
            <p className="text-[10px] text-muted-foreground">
              TikTok may add recommended music to photo posts
            </p>
          </div>
          <Switch
            id={`${accountId}-tt-music`}
            checked={data.autoAddMusic ?? false}
            onCheckedChange={(checked) =>
              onChange({ ...data, autoAddMusic: checked })
            }
          />
        </div>
      )}
    </div>
  );
}
