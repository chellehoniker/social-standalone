"use client";

import type { Account, UploadedMedia } from "@/hooks";
import type {
  PlatformSpecificData,
  FacebookPlatformData,
  InstagramPlatformData,
  GoogleBusinessPlatformData,
} from "@/lib/late-api/types";
import { FacebookOptions } from "./facebook-options";
import { InstagramOptions } from "./instagram-options";
import { GoogleBusinessOptions } from "./google-business-options";

interface PlatformOptionsProps {
  selectedAccounts: Account[];
  platformDataMap: Record<string, PlatformSpecificData>;
  updatePlatformData: (
    accountId: string,
    data: PlatformSpecificData | undefined
  ) => void;
  hasVideo: boolean;
  hasImages: boolean;
  media: UploadedMedia[];
}

export function PlatformOptions({
  selectedAccounts,
  platformDataMap,
  updatePlatformData,
  hasVideo,
  hasImages,
  media,
}: PlatformOptionsProps) {
  const facebookAccounts = selectedAccounts.filter(
    (a) => a.platform === "facebook"
  );
  const instagramAccounts = selectedAccounts.filter(
    (a) => a.platform === "instagram"
  );
  const googleAccounts = selectedAccounts.filter(
    (a) => a.platform === "googlebusiness"
  );

  const hasOptions =
    facebookAccounts.length > 0 ||
    instagramAccounts.length > 0 ||
    googleAccounts.length > 0;

  if (!hasOptions) return null;

  return (
    <div className="space-y-2 mt-3">
      {facebookAccounts.map((account) => (
        <FacebookOptions
          key={account._id}
          accountId={account._id}
          data={
            (platformDataMap[account._id] as FacebookPlatformData) ?? {}
          }
          onChange={(data) => updatePlatformData(account._id, data)}
          hasVideo={hasVideo}
        />
      ))}
      {instagramAccounts.map((account) => (
        <InstagramOptions
          key={account._id}
          accountId={account._id}
          data={
            (platformDataMap[account._id] as InstagramPlatformData) ?? {}
          }
          onChange={(data) => updatePlatformData(account._id, data)}
          media={media}
        />
      ))}
      {googleAccounts.map((account) => (
        <GoogleBusinessOptions
          key={account._id}
          accountId={account._id}
          data={
            (platformDataMap[account._id] as GoogleBusinessPlatformData) ??
            {}
          }
          onChange={(data) => updatePlatformData(account._id, data)}
        />
      ))}
    </div>
  );
}
