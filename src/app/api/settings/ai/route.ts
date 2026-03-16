import { NextRequest, NextResponse } from "next/server";
import { validateTenantFromRequest, isValidationError } from "@/lib/auth/validate-tenant";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt, decrypt, maskKey } from "@/lib/crypto/encrypt";
import { unauthorized, forbidden, serverError } from "@/lib/api/errors";

const KEY_FIELDS = [
  "openai_key_encrypted",
  "anthropic_key_encrypted",
  "gemini_key_encrypted",
  "freepik_key_encrypted",
] as const;

/**
 * GET /api/settings/ai
 * Returns the user's AI settings with API keys masked.
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("user_ai_settings")
      .select("*")
      .eq("id", validation.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // No settings row yet — return defaults
      return NextResponse.json({
        ai_enabled: false,
        openai_key: null,
        anthropic_key: null,
        gemini_key: null,
        freepik_key: null,
        preferred_ai_provider: "openai",
        freepik_image_model: "mystic",
        freepik_video_model: "kling-o1-pro",
        image_style_prompt: null,
        prose_guide: null,
        brand_guide: null,
        copywriting_guide: null,
        social_media_guide: null,
      });
    }

    if (error) {
      return serverError(error, { action: "getAiSettings" });
    }

    // Mask API keys for client display
    const masked: Record<string, unknown> = {
      ai_enabled: data.ai_enabled,
      preferred_ai_provider: data.preferred_ai_provider,
      freepik_image_model: data.freepik_image_model,
      freepik_video_model: data.freepik_video_model,
      image_style_prompt: data.image_style_prompt,
      prose_guide: data.prose_guide,
      brand_guide: data.brand_guide,
      copywriting_guide: data.copywriting_guide,
      social_media_guide: data.social_media_guide,
    };

    for (const field of KEY_FIELDS) {
      const friendlyName = field.replace("_encrypted", "");
      if (data[field]) {
        try {
          const decrypted = decrypt(data[field]);
          masked[friendlyName] = maskKey(decrypted);
        } catch {
          masked[friendlyName] = "***invalid***";
        }
      } else {
        masked[friendlyName] = null;
      }
    }

    return NextResponse.json(masked);
  } catch (err) {
    return serverError(err, { action: "getAiSettings" });
  }
}

/**
 * PUT /api/settings/ai
 * Update the user's AI settings. API keys are encrypted before storage.
 */
export async function PUT(request: NextRequest) {
  const validation = await validateTenantFromRequest(request);
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const userId = validation.user.id;

    // Build the update object
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Simple fields (pass through)
    const simpleFields = [
      "ai_enabled",
      "preferred_ai_provider",
      "freepik_image_model",
      "freepik_video_model",
      "image_style_prompt",
      "prose_guide",
      "brand_guide",
      "copywriting_guide",
      "social_media_guide",
    ];

    for (const field of simpleFields) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    // Encrypt API keys (only update if a new value is provided, not a masked one)
    const keyMap: Record<string, string> = {
      openai_key: "openai_key_encrypted",
      anthropic_key: "anthropic_key_encrypted",
      gemini_key: "gemini_key_encrypted",
      freepik_key: "freepik_key_encrypted",
    };

    for (const [inputField, dbField] of Object.entries(keyMap)) {
      if (inputField in body) {
        const value = body[inputField] as string | null;
        if (value === null || value === "") {
          // Clear the key
          update[dbField] = null;
        } else if (!value.includes("...")) {
          // Only encrypt if it's a new key (not the masked version)
          update[dbField] = encrypt(value);
        }
        // If it contains "...", it's the masked version — skip (don't overwrite)
      }
    }

    // Upsert: insert if not exists, update if exists
    const { error } = await (supabase as any)
      .from("user_ai_settings")
      .upsert(
        { id: userId, ...update },
        { onConflict: "id" }
      );

    if (error) {
      return serverError(error, { action: "updateAiSettings" });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err, { action: "updateAiSettings" });
  }
}
