import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { createAIProvider } from "@/lib/ai";
import { unauthorized, forbidden, serverError, badRequest } from "@/lib/api/errors";

/**
 * POST /api/campaigns/generate
 * Generate a campaign plan using the user's AI provider.
 * Body: { campaignId }
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { campaignId } = body;
  if (!campaignId) return badRequest("campaignId is required");

  try {
    const supabase = createServiceClient();
    const userId = validation.user.id;

    // Get the campaign
    const { data: campaign, error: campError } = await (supabase as any)
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single();

    if (campError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get AI settings
    const { data: settings, error: settingsError } = await (supabase as any)
      .from("user_ai_settings")
      .select("*")
      .eq("id", userId)
      .single();

    if (settingsError || !settings || !settings.ai_enabled) {
      return badRequest("AI is not configured. Please add your API keys in Settings.");
    }

    // Decrypt the appropriate API key
    const provider = settings.preferred_ai_provider || "openai";
    const keyField = `${provider}_key_encrypted`;
    const encryptedKey = settings[keyField];

    if (!encryptedKey) {
      return badRequest(`No API key configured for ${provider}. Please add it in Settings.`);
    }

    const apiKey = decrypt(encryptedKey);
    const ai = createAIProvider(provider, apiKey);

    // Update campaign status
    await (supabase as any)
      .from("campaigns")
      .update({ status: "generating", ai_provider_used: provider, updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    // Generate the plan
    const platforms = (campaign.platforms || []).map((p: any) =>
      typeof p === "string" ? p : p.platform
    );

    const plan = await ai.generateCampaignPlan({
      objective: campaign.objective,
      durationDays: campaign.duration_days,
      platforms,
      contentMix: campaign.content_mix || "mixed",
      referenceText: campaign.reference_text || undefined,
      proseGuide: settings.prose_guide || undefined,
      brandGuide: settings.brand_guide || undefined,
      copywritingGuide: settings.copywriting_guide || undefined,
      socialMediaGuide: settings.social_media_guide || undefined,
      imageStylePrompt: settings.image_style_prompt || undefined,
    });

    // Save plan to campaign
    await (supabase as any)
      .from("campaigns")
      .update({
        post_plan: plan,
        status: "review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Create campaign_posts rows
    // Delete existing posts first (in case of regeneration)
    await (supabase as any)
      .from("campaign_posts")
      .delete()
      .eq("campaign_id", campaignId);

    const posts = plan.map((day) => ({
      campaign_id: campaignId,
      user_id: userId,
      day_number: day.day,
      caption_variants: day.captions,
      media_urls: [],
      status: "draft",
    }));

    if (posts.length > 0) {
      await (supabase as any)
        .from("campaign_posts")
        .insert(posts);
    }

    return NextResponse.json({ plan, postCount: plan.length });
  } catch (err) {
    // Reset campaign status on failure
    try {
      const supabase = createServiceClient();
      await (supabase as any)
        .from("campaigns")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", body.campaignId);
    } catch { /* ignore cleanup error */ }

    return serverError(err, { action: "generateCampaignPlan", campaignId: body.campaignId });
  }
}
