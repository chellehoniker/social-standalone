/**
 * AI Provider Abstraction
 *
 * Unified interface for generating campaign content across
 * OpenAI, Anthropic, and Google Gemini.
 */

export interface CampaignPlanParams {
  objective: string;
  durationDays: number;
  platforms: string[];
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
  videoPrompt?: string;
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
    "imagePrompt": "Detailed image generation prompt describing the visual...",
    "contentType": "image",
    "hashtags": ["relevant", "hashtags"]
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
- Image prompts should be detailed and specific for AI generation
- Mix content types across the campaign (mostly images, some video-worthy days)
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

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array from AI response");
  }

  return parsed.map((item: any, index: number) => ({
    day: item.day ?? index + 1,
    theme: item.theme || "Untitled",
    captions: item.captions || {},
    imagePrompt: item.imagePrompt || item.image_prompt || "",
    videoPrompt: item.videoPrompt || item.video_prompt,
    contentType: item.contentType || item.content_type || "image",
    hashtags: item.hashtags || [],
  }));
}
