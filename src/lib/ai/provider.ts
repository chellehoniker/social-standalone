/**
 * AI Provider Abstraction
 *
 * Unified interface for generating campaign content across
 * OpenAI, Anthropic, and Google Gemini.
 */

export type ContentMix = "mostly_images" | "mixed" | "images_only" | "videos_only" | "user_decides";

export interface CampaignPlanParams {
  objective: string;
  durationDays: number;
  platforms: string[];
  contentMix?: ContentMix;
  referenceText?: string;
  proseGuide?: string;
  brandGuide?: string;
  copywritingGuide?: string;
  socialMediaGuide?: string;
  imageStylePrompt?: string;
}

export interface CampaignDay {
  day: number;
  theme: string;
  captions: Record<string, string>; // platform → caption
  imagePrompt: string;
  imagePrompts?: string[]; // for carousel: array of prompts (one per slide)
  videoPrompt?: string;
  musicPrompt?: string; // mood/style for AI music on video posts
  videoDuration?: number; // total seconds: 5, 10, 20, 30, 60. Clips chained for >10s
  includeMusic?: boolean; // default true for video posts
  contentType: "image" | "video" | "carousel";
  hashtags?: string[];
}

export interface CaptionRegenerateParams {
  platform: string;
  originalCaption: string;
  theme: string;
  objective: string;
  proseGuide?: string;
  brandGuide?: string;
  copywritingGuide?: string;
  socialMediaGuide?: string;
}

export interface AIProvider {
  generateCampaignPlan(params: CampaignPlanParams): Promise<CampaignDay[]>;
  regenerateCaption(params: CaptionRegenerateParams): Promise<string>;
}

/**
 * Get the system prompt for campaign generation.
 */
export function buildCampaignSystemPrompt(params: CampaignPlanParams): string {
  const parts = [
    `You are an expert social media strategist. Create a ${params.durationDays}-day social media campaign plan.`,
    `\nThe campaign objective: ${params.objective}`,
    `\nTarget platforms: ${params.platforms.join(", ")}`,
  ];

  if (params.proseGuide) {
    parts.push(`\n## Prose Guide\n${params.proseGuide}`);
  }
  if (params.brandGuide) {
    parts.push(`\n## Brand Guide\n${params.brandGuide}`);
  }
  if (params.copywritingGuide) {
    parts.push(`\n## Copywriting Guide\n${params.copywritingGuide}`);
  }
  if (params.socialMediaGuide) {
    parts.push(`\n## Social Media Guide\n${params.socialMediaGuide}`);
  }
  if (params.imageStylePrompt) {
    parts.push(`\n## Image Style\nWhen writing image prompts, use this style: ${params.imageStylePrompt}`);
  }
  if (params.referenceText) {
    parts.push(`\n## Reference Material\nThe user has provided the following reference text (e.g., a book chapter, synopsis, or other content). Use this to inform the campaign's themes, tone, and specific details. Pull quotes, character names, plot points, and imagery from this material to make the social media content authentic and specific.\n\n${params.referenceText}`);
  }

  parts.push(`
## Output Format
Return a JSON array of objects. Each object represents one day's post:

\`\`\`json
[
  {
    "day": 1,
    "theme": "Brief theme description",
    "captions": {
      "instagram": "Instagram-optimized caption with hashtags...",
      "tiktok": "TikTok caption with trending hooks...",
      "facebook": "Facebook caption...",
      "linkedin": "Professional LinkedIn caption..."
    },
    "imagePrompt": "Detailed image generation prompt for the main visual...",
    "contentType": "image",
    "hashtags": ["relevant", "hashtags"]
  },
  {
    "day": 5,
    "theme": "Character reveal carousel",
    "captions": { ... },
    "imagePrompt": "First slide visual description",
    "imagePrompts": ["Slide 1 prompt", "Slide 2 prompt", "Slide 3 prompt", "Slide 4 prompt"],
    "contentType": "carousel",
    "hashtags": [...]
  },
  {
    "day": 10,
    "theme": "Behind the scenes reel",
    "captions": { ... },
    "imagePrompt": "Still frame for the video - describes the opening shot",
    "videoPrompt": "Camera slowly pans across... describe the motion and transitions",
    "musicPrompt": "Upbeat acoustic guitar, warm and inviting, bookish vibes",
    "contentType": "video",
    "hashtags": [...]
  }
]
\`\`\`

Rules:
- Each platform gets a UNIQUE caption tailored to its audience and format
- Instagram: use 5-10 hashtags, engaging hook, call to action
- TikTok: short punchy hook, trending language, under 150 chars
- Facebook: conversational, questions to drive engagement
- LinkedIn: professional tone, thought leadership angle
- Twitter/X: under 280 chars, punchy, with 1-2 hashtags
- Pinterest: keyword-rich description for search
- CRITICAL for image prompts: NEVER include text, words, letters, numbers, titles, quotes, or any readable content in image prompts. AI image generators cannot render text — it will appear garbled and ruin the image. Use visual metaphors instead. For example, instead of "text overlay saying 'Book 1 is out now'", write "a glowing book floating over water with dramatic lighting"
- Image prompts should describe ONE clear visual scene — a single composition, not a storyboard or multiple shots
- Keep image prompts under 100 words — overly complex prompts produce confused results
- Content mix preference: ${
    params.contentMix === "images_only" || params.contentMix === "user_decides"
      ? "100% single images. Do NOT include any carousel or video content types."
      : params.contentMix === "mostly_images"
      ? "~85% single images, ~15% carousels (3-5 slides). No videos."
      : params.contentMix === "videos_only"
      ? "100% video posts. Every single day should have contentType 'video' with a videoPrompt describing camera motion and a musicPrompt describing the audio mood. Each post still needs an imagePrompt for the video's first frame."
      : "~60% single images, ~25% carousels (3-5 slides), ~15% video"
  }
- For carousels: provide "imagePrompts" array with 3-5 slide descriptions that tell a visual story
- For videos: "videoPrompt" must describe ONLY simple camera motion for a SINGLE continuous shot (e.g., "slow zoom in", "gentle pan left to right", "cinematic dolly forward"). Do NOT write multi-scene storyboards, cuts, transitions between shots, or text overlays — the video generator creates one 5-10 second continuous clip from a single still image. Keep videoPrompt under 30 words.
- "musicPrompt" describes the audio mood in simple terms (e.g., "warm acoustic guitar, calm and inviting")
- "imagePrompt" is always required (used as hero image / video first frame / first carousel slide)
- Build narrative momentum across the ${params.durationDays} days
- Only include captions for the platforms listed above

Return ONLY the JSON array, no other text.`);

  return parts.join("\n");
}

/**
 * Parse the AI response into structured campaign days.
 * Handles markdown code fences and malformed JSON gracefully.
 */
export function parseCampaignResponse(response: string): CampaignDay[] {
  // Strip markdown code fences
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to recover from truncated JSON by finding the last complete object
    // Look for the last "},\n  {" or "}\n]" pattern and close the array
    const lastCompleteObj = cleaned.lastIndexOf("},");
    if (lastCompleteObj > 0) {
      const recovered = cleaned.slice(0, lastCompleteObj + 1) + "]";
      try {
        parsed = JSON.parse(recovered);
        console.log(`[AI] Recovered ${parsed.length} days from truncated JSON (original was cut at position ${cleaned.length})`);
      } catch {
        throw e; // Recovery failed, throw original error
      }
    } else {
      throw e;
    }
  }

  if (!Array.isArray(parsed)) {
    // OpenAI json_object mode may wrap in an object
    const arr = parsed.days || parsed.campaign || parsed.posts || parsed.plan;
    if (Array.isArray(arr)) {
      parsed = arr;
    } else {
      throw new Error("Expected JSON array from AI response");
    }
  }

  return parsed.map((item: any, index: number) => ({
    day: item.day ?? index + 1,
    theme: item.theme || "Untitled",
    captions: item.captions || {},
    imagePrompt: item.imagePrompt || item.image_prompt || "",
    imagePrompts: item.imagePrompts || item.image_prompts,
    videoPrompt: item.videoPrompt || item.video_prompt,
    musicPrompt: item.musicPrompt || item.music_prompt,
    contentType: item.contentType || item.content_type || "image",
    hashtags: item.hashtags || [],
  }));
}
