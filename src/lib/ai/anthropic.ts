import Anthropic from "@anthropic-ai/sdk";
import {
  type AIProvider,
  type CampaignPlanParams,
  type CampaignDay,
  type CaptionRegenerateParams,
  buildCampaignSystemPrompt,
  parseCampaignResponse,
} from "./provider";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateCampaignPlan(params: CampaignPlanParams): Promise<CampaignDay[]> {
    const systemPrompt = buildCampaignSystemPrompt(params);

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: params.durationDays > 14 ? 64000 : 16000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Create a ${params.durationDays}-day social media campaign plan for: ${params.objective}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type from Anthropic");

    return parseCampaignResponse(content.text);
  }

  async regenerateCaption(params: CaptionRegenerateParams): Promise<string> {
    const systemParts = [
      "You are a social media copywriter. Rewrite the following caption for the specified platform.",
    ];
    if (params.proseGuide) systemParts.push(`Prose Guide: ${params.proseGuide}`);
    if (params.brandGuide) systemParts.push(`Brand Guide: ${params.brandGuide}`);
    if (params.copywritingGuide) systemParts.push(`Copywriting Guide: ${params.copywritingGuide}`);
    if (params.socialMediaGuide) systemParts.push(`Social Media Guide: ${params.socialMediaGuide}`);

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemParts.join("\n\n"),
      messages: [
        {
          role: "user",
          content: `Platform: ${params.platform}\nTheme: ${params.theme}\nObjective: ${params.objective}\nOriginal caption: ${params.originalCaption}\n\nWrite a fresh, engaging caption for this platform. Return ONLY the caption text.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return params.originalCaption;
    return content.text.trim();
  }
}
