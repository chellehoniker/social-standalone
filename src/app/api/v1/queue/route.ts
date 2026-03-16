import { NextRequest } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, rateLimited, badGateway, serverError } from "@/lib/api/errors";
import { jsonWithCache, CacheDuration } from "@/lib/api/cache";

/**
 * GET /api/v1/queue
 * List queue schedules for the authenticated user.
 * Query params: queueId (optional, specific queue), all (optional, list all queues)
 */
export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "listQueue" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;

  try {
    const late = await getLateClient();
    const { data, error } = await late.queue.listQueueSlots({
      query: {
        profileId,
        all: searchParams.get("all") === "true" ? "true" : undefined,
        queueId: searchParams.get("queueId") || undefined,
      },
    });

    if (error) {
      return badGateway("Late API", error);
    }

    return jsonWithCache(data, CacheDuration.SHORT);
  } catch (err) {
    return serverError(err, { action: "listQueue", profileId });
  }
}
