export type { AIProvider, CampaignPlanParams, CampaignDay, CaptionRegenerateParams } from "./provider";
export { buildCampaignSystemPrompt, parseCampaignResponse } from "./provider";
export { OpenAIProvider } from "./openai";
export { AnthropicProvider } from "./anthropic";
export { GeminiProvider } from "./gemini";
export { PLATFORM_IMAGE_SIZES, getDefaultSizeKey, getDeduplicationGroups } from "./platform-sizes";
export type { PlatformSize } from "./platform-sizes";

import type { AIProvider } from "./provider";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";

/**
 * Create an AI provider instance based on the provider name and API key.
 */
export function createAIProvider(
  provider: "openai" | "anthropic" | "gemini",
  apiKey: string
): AIProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
