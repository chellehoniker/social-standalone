import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createServiceClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, rateLimited, serverError } from "@/lib/api/errors";
import { jsonWithCache, CacheDuration } from "@/lib/api/cache";

/**
 * GET /api/v1/guides
 * Returns the user's content guides for AI-assisted caption writing.
 */
export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "getGuides" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as any)
      .from("user_ai_settings")
      .select("prose_guide, brand_guide, copywriting_guide, social_media_guide, image_style_prompt")
      .eq("id", validation.profile.id)
      .single();

    if (error && error.code === "PGRST116") {
      // No settings row — return empty guides
      return NextResponse.json({
        prose_guide: null,
        brand_guide: null,
        copywriting_guide: null,
        social_media_guide: null,
        image_style_prompt: null,
      });
    }

    if (error) return serverError(error, { action: "getGuides" });

    return jsonWithCache(data, CacheDuration.MEDIUM);
  } catch (err) {
    return serverError(err, { action: "getGuides" });
  }
}
