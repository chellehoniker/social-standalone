"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  InstagramPlatformData,
  InstagramUserTag,
} from "@/lib/late-api/types";
import type { UploadedMedia } from "@/hooks";
import { X, Plus } from "lucide-react";

interface InstagramOptionsProps {
  accountId: string;
  data: InstagramPlatformData;
  onChange: (data: InstagramPlatformData) => void;
  media: UploadedMedia[];
}

export function InstagramOptions({
  accountId,
  data,
  onChange,
  media,
}: InstagramOptionsProps) {
  const isCarousel = media.length > 1;
  const tags = data.userTags ?? [];

  const addTag = () => {
    onChange({
      ...data,
      userTags: [
        ...tags,
        { username: "", x: 0.5, y: 0.5, ...(isCarousel && { mediaIndex: 0 }) },
      ],
    });
  };

  const removeTag = (index: number) => {
    const updated = tags.filter((_, i) => i !== index);
    onChange({
      ...data,
      userTags: updated.length > 0 ? updated : undefined,
    });
  };

  const updateTag = (index: number, partial: Partial<InstagramUserTag>) => {
    onChange({
      ...data,
      userTags: tags.map((t, i) => (i === index ? { ...t, ...partial } : t)),
    });
  };

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Instagram Options
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Tag users</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={addTag}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add tag
          </Button>
        </div>

        {tags.map((tag, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="@username"
              value={tag.username}
              onChange={(e) => updateTag(i, { username: e.target.value })}
              className="h-7 text-xs flex-1"
            />
            {isCarousel && (
              <Select
                value={String(tag.mediaIndex ?? 0)}
                onValueChange={(v) => updateTag(i, { mediaIndex: Number(v) })}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {media.map((_, idx) => (
                    <SelectItem
                      key={idx}
                      value={String(idx)}
                      className="text-xs"
                    >
                      Slide {idx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => removeTag(i)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground">No user tags added.</p>
        )}

        {isCarousel && tags.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Select which carousel slide each user is tagged on.
          </p>
        )}
      </div>
    </div>
  );
}
