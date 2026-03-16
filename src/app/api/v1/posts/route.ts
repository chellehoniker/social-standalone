import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isApiKeyError } from "@/lib/auth/validate-api-key";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { getLateClient } from "@/lib/late-api";
import { parseRequestBody, ExternalCreatePostSchema } from "@/lib/validations";
import {
  unauthorized,
  forbidden,
  rateLimited,
  badGateway,
  serverError,
} from "@/lib/api/errors";

/**
 * GET /api/v1/posts
 * List posts for the authenticated user's profile.
 * Query params: status, dateFrom, dateTo, page, limit
 */
export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
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
    const { data, error } = await late.posts.listPosts({
      query: {
        profileId,
        status: searchParams.get("status") as
          | "scheduled"
          | "published"
          | "failed"
          | undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
        page: searchParams.get("page")
          ? parseInt(searchParams.get("page")!)
          : undefined,
        limit: searchParams.get("limit")
          ? parseInt(searchParams.get("limit")!)
          : undefined,
      },
    });

    if (error) {
      return badGateway("Late API", error);
    }

    return NextResponse.json(data);
  } catch (err) {
    return serverError(err, { action: "listPosts", profileId });
  }
}

/**
 * POST /api/v1/posts
 * Create a new post.
 * Body: { content, accountIds, scheduledAt?, publishNow?, mediaItems?, timezone? }
 */
export async function POST(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (isApiKeyError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const limited = checkRateLimit(validation.profile.id);
  if (limited) {
    return rateLimited(
      `Rate limit exceeded. Resets at ${new Date(limited.resetAt).toISOString()}`
    );
  }

  const { profileId } = validation;

  const parsed = await parseRequestBody(request, ExternalCreatePostSchema);
  if (!parsed.success) return parsed.response;

  // Transform simplified external format to GetLate API shape
  const { accountIds, scheduledAt, tiktokOptions, ...rest } = parsed.data;

  try {
    const late = await getLateClient();

    // Look up account platforms to properly build the platforms array
    const { data: accountsData } = await late.accounts.listAccounts({
      query: { profileId },
    });
    const accountsMap = new Map(
      (accountsData?.accounts || []).map((a: any) => [a._id, a.platform])
    );

    const platforms = accountIds.map((accountId) => {
      const platform = accountsMap.get(accountId);
      const entry: Record<string, unknown> = { accountId, platform };

      // Apply TikTok options (default draft:false to prevent inbox-only posts)
      if (platform === "tiktok") {
        entry.platformSpecificData = {
          draft: false,
          ...tiktokOptions,
        };
      }

      return entry;
    });

    const { data, error } = await late.posts.createPost({
      body: {
        ...rest,
        platforms,
        scheduledFor: scheduledAt,
        profileId,
      },
    });

    if (error) {
      return serverError(error, { action: "createPost", profileId });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return serverError(err, { action: "createPost", profileId });
  }
}
