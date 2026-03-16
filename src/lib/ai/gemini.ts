import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type AIProvider,
  type CampaignPlanParams,
  type CampaignDay,
  type CaptionRegenerateParams,
  buildCampaignSystemPrompt,
  parseCampaignResponse,
} from "./provider";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateCampaignPlan(params: CampaignPlanParams): Promise<CampaignDay[]> {
    const systemPrompt = buildCampaignSystemPrompt(params);
    const model = this.client.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(
      `Create a ${params.durationDays}-day social media campaign plan for: ${params.objective}`
    );

    const content = result.response.text();
    if (!content) throw new Error("Empty response from Gemini");

    return parseCampaignResponse(content);
  }

  async regenerateCaption(params: CaptionRegenerateParams): Promise<string> {
    const systemParts = [
      "You are a social media copywriter. Rewrite the following caption for the specified platform.",
    ];
    if (params.proseGuide) systemParts.push(`Prose Guide: ${params.proseGuide}`);
    if (params.brandGuide) systemParts.push(`Brand Guide: ${params.brandGuide}`);
    if (params.copywritingGuide) systemParts.push(`Copywriting Guide: ${params.copywritingGuide}`);
    if (params.socialMediaGuide) systemParts.push(`Social Media Guide: ${params.socialMediaGuide}`);

    const model = this.client.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemParts.join("\n\n"),
    });

    const result = await model.generateContent(
      `Platform: ${params.platform}\nTheme: ${params.theme}\nObjective: ${params.objective}\nOriginal caption: ${params.originalCaption}\n\nWrite a fresh, engaging caption for this platform. Return ONLY the caption text.`
    );

    return result.response.text()?.trim() || params.originalCaption;
  }
}
