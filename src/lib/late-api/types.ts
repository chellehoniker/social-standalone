// Re-export types from the SDK and add any additional types we need

// Platform types
export type Platform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "twitter"
  | "facebook"
  | "threads"
  | "bluesky"
  | "snapchat"
  | "googlebusiness"
  | "reddit"
  | "telegram";

export const PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "pinterest",
  "twitter",
  "facebook",
  "threads",
  "bluesky",
  "snapchat",
  "googlebusiness",
  "reddit",
  "telegram",
];

export const PLATFORM_NAMES: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  twitter: "X (Twitter)",
  facebook: "Facebook",
  threads: "Threads",
  bluesky: "Bluesky",
  snapchat: "Snapchat",
  googlebusiness: "Google",
  reddit: "Reddit",
  telegram: "Telegram",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#E4405F",
  tiktok: "#000000",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  twitter: "#000000",
  facebook: "#1877F2",
  threads: "#000000",
  bluesky: "#0085FF",
  snapchat: "#F7D900",
  googlebusiness: "#4285F4",
  reddit: "#FF4500",
  telegram: "#26A5E4",
};

// Platforms that require entity selection after OAuth
export const PLATFORMS_WITH_ENTITY_SELECTION = [
  "facebook",
  "linkedin",
  "pinterest",
  "googlebusiness",
] as const;

// Platform constraints
export const PLATFORM_CONSTRAINTS: Record<
  Platform,
  {
    requiresMedia?: boolean;
    requiresVideo?: boolean;
    noVideo?: boolean;
    maxImages?: number;
    maxCarouselItems?: number;
  }
> = {
  instagram: { maxCarouselItems: 10 },
  tiktok: {},
  youtube: { requiresVideo: true },
  linkedin: { maxImages: 20 },
  pinterest: {},
  twitter: { maxImages: 4 },
  facebook: {},
  threads: { maxCarouselItems: 10 },
  bluesky: { maxImages: 4 },
  snapchat: { requiresMedia: true },
  googlebusiness: { noVideo: true },
  reddit: {},
  telegram: {},
};

// Platform-specific data types (for the composer)
export interface TikTokPlatformData {
  privacyLevel: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercialContentType: "none" | "brand_organic" | "brand_content";
  videoCoverTimestampMs?: number;
  photoCoverIndex?: number;
}

export interface YouTubePlatformData {
  title: string;
  visibility: "public" | "private" | "unlisted";
  madeForKids: boolean;
}

export interface PinterestPlatformData {
  title?: string;
  boardId: string;
  link?: string;
}

export interface InstagramPlatformData {
  contentType?: "story";
  shareToFeed?: boolean;
  collaborators?: string[];
  thumbOffset?: number;
}

export interface FacebookPlatformData {
  contentType?: "story";
  firstComment?: string;
}

export interface LinkedInPlatformData {
  firstComment?: string;
  disableLinkPreview?: boolean;
}

export interface GoogleBusinessPlatformData {
  callToAction?: {
    type: string;
    url: string;
  };
}

export interface TelegramPlatformData {
  parseMode?: "HTML";
  disableNotification?: boolean;
}

export interface ThreadPlatformData {
  threadItems?: Array<{
    content: string;
    mediaItems?: Array<{ type: "image" | "video"; url: string }>;
  }>;
}

export type PlatformSpecificData =
  | TikTokPlatformData
  | YouTubePlatformData
  | PinterestPlatformData
  | InstagramPlatformData
  | FacebookPlatformData
  | LinkedInPlatformData
  | GoogleBusinessPlatformData
  | TelegramPlatformData
  | ThreadPlatformData;
