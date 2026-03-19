import OpenAI from "openai";
import {
  type AIProvider,
  type CampaignPlanParams,
  type CampaignDay,
  type CaptionRegenerateParams,
  buildCampaignSystemPrompt,
  parseCampaignResponse,
} from "./provider";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateCampaignPlan(params: CampaignPlanParams): Promise<CampaignDay[]> {
    const systemPrompt = buildCampaignSystemPrompt(params);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create a ${params.durationDays}-day social media campaign plan for: ${params.objective}`,
        },
      ],
      temperature: 0.8,
      max_tokens: params.durationDays > 14 ? 64000 : 16000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    // OpenAI json_object mode may wrap in { "days": [...] }
    let parsed;
    try {
      const obj = JSON.parse(content);
      parsed = Array.isArray(obj) ? obj : obj.days || obj.campaign || obj.posts || obj.plan;
      if (!Array.isArray(parsed)) {
        throw new Error("Could not find array in response");
      }
    } catch {
      parsed = parseCampaignResponse(content);
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

  async regenerateCaption(params: CaptionRegenerateParams): Promise<string> {
    const systemParts = [
      "You are a social media copywriter. Rewrite the following caption for the specified platform.",
    ];
    if (params.proseGuide) systemParts.push(`Prose Guide: ${params.proseGuide}`);
    if (params.brandGuide) systemParts.push(`Brand Guide: ${params.brandGuide}`);
    if (params.copywritingGuide) systemParts.push(`Copywriting Guide: ${params.copywritingGuide}`);
    if (params.socialMediaGuide) systemParts.push(`Social Media Guide: ${params.socialMediaGuide}`);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemParts.join("\n\n") },
        {
          role: "user",
          content: `Platform: ${params.platform}\nTheme: ${params.theme}\nObjective: ${params.objective}\nOriginal caption: ${params.originalCaption}\n\nWrite a fresh, engaging caption for this platform. Return ONLY the caption text.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content?.trim() || params.originalCaption;
  }
}
