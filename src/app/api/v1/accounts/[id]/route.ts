import { NextRequest } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { getLateClient } from "@/lib/late-api";
import {
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  badGateway,
  serverError,
} from "@/lib/api/errors";
import { jsonWithCache, CacheDuration } from "@/lib/api/cache";

/**
 * GET /api/v1/accounts/[id]
 * Get a single connected account by ID (verifies ownership via profile).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return serverError(validation.error, { action: "getAccount" });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const { id } = await params;
  const { profileId } = validation;

  try {
    const late = await getLateClient();
    const { data, error } = await late.accounts.listAccounts({
      query: { profileId },
    });

    if (error) {
      return badGateway("Late API", error);
    }

    const account = data?.accounts?.find(
      (a: { _id?: string }) => a._id === id
    );
    if (!account) {
      return notFound("Account");
    }

    return jsonWithCache({ account }, CacheDuration.SHORT);
  } catch (err) {
    return serverError(err, { action: "getAccount", accountId: id, profileId });
  }
}
