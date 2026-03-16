/**
 * Platform-specific image dimensions for social media posts.
 * Used by the campaign wizard to generate correctly-sized media.
 */

export interface PlatformSize {
  width: number;
  height: number;
  ratio: string;
  label: string;
}

export const PLATFORM_IMAGE_SIZES: Record<string, PlatformSize> = {
  instagram_feed: { width: 1080, height: 1350, ratio: "4:5", label: "Instagram Feed" },
  instagram_story: { width: 1080, height: 1920, ratio: "9:16", label: "Instagram Story/Reel" },
  tiktok: { width: 1080, height: 1920, ratio: "9:16", label: "TikTok" },
  facebook_feed: { width: 1080, height: 1350, ratio: "4:5", label: "Facebook Feed" },
  linkedin: { width: 1200, height: 1200, ratio: "1:1", label: "LinkedIn" },
  twitter: { width: 1200, height: 675, ratio: "16:9", label: "X / Twitter" },
  pinterest: { width: 1000, height: 1500, ratio: "2:3", label: "Pinterest" },
  youtube_thumb: { width: 1280, height: 720, ratio: "16:9", label: "YouTube Thumbnail" },
  bluesky: { width: 1200, height: 675, ratio: "16:9", label: "Bluesky" },
  threads: { width: 1080, height: 1350, ratio: "4:5", label: "Threads" },
  googlebusiness: { width: 1200, height: 675, ratio: "16:9", label: "Google Business" },
  reddit: { width: 1200, height: 675, ratio: "16:9", label: "Reddit" },
  telegram: { width: 1280, height: 720, ratio: "16:9", label: "Telegram" },
  snapchat: { width: 1080, height: 1920, ratio: "9:16", label: "Snapchat" },
} as const;

/**
 * Map platform names to their default image size key.
 * Some platforms have multiple formats (feed vs story); this returns the default.
 */
export function getDefaultSizeKey(platform: string): string {
  switch (platform) {
    case "instagram": return "instagram_feed";
    case "tiktok": return "tiktok";
    case "facebook": return "facebook_feed";
    case "linkedin": return "linkedin";
    case "twitter": return "twitter";
    case "pinterest": return "pinterest";
    case "youtube": return "youtube_thumb";
    case "bluesky": return "bluesky";
    case "threads": return "threads";
    case "googlebusiness": return "googlebusiness";
    case "reddit": return "reddit";
    case "telegram": return "telegram";
    case "snapchat": return "snapchat";
    default: return "twitter"; // safe fallback (16:9)
  }
}

/**
 * Deduplication groups: platforms that share the same aspect ratio
 * can reuse a single generated image. Returns groups of size keys.
 */
export function getDeduplicationGroups(sizeKeys: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const key of sizeKeys) {
    const size = PLATFORM_IMAGE_SIZES[key];
    if (!size) continue;

    const signature = `${size.width}x${size.height}`;
    const group = groups.get(signature) || [];
    group.push(key);
    groups.set(signature, group);
  }

  return groups;
}
