"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { GoogleBusinessPlatformData } from "@/lib/late-api/types";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "nl", label: "Dutch" },
  { code: "ru", label: "Russian" },
  { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" },
];

interface GoogleBusinessOptionsProps {
  accountId: string;
  data: GoogleBusinessPlatformData;
  onChange: (data: GoogleBusinessPlatformData) => void;
}

export function GoogleBusinessOptions({
  data,
  onChange,
}: GoogleBusinessOptionsProps) {
  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Google Business Options
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Post language (optional)</Label>
        <Select
          value={data.languageCode ?? "auto"}
          onValueChange={(val) =>
            onChange({
              ...data,
              languageCode: val === "auto" ? undefined : val,
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Auto-detect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto" className="text-xs">
              Auto-detect
            </SelectItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.code} value={lang.code} className="text-xs">
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Set explicitly for short posts, mixed languages, or transliteration.
        </p>
      </div>
    </div>
  );
}
