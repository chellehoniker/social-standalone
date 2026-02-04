import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";
import { getLateClient } from "@/lib/late-api";
import { unauthorized, forbidden, badGateway, serverError } from "@/lib/api/errors";
import { parseRequestBody, CreatePostSchema } from "@/lib/validations";
import { jsonWithCache, CacheDuration } from "@/lib/api/cache";

/**
 * GET /api/late/posts
 * Returns posts for the tenant's profile
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;

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

  return jsonWithCache(data, CacheDuration.SHORT);
}

/**
 * POST /api/late/posts
 * Creates a new post
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    if (validation.status === 401) return unauthorized(validation.error);
    if (validation.status === 403) return forbidden(validation.error);
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;

  const parsed = await parseRequestBody(request, CreatePostSchema);
  if (!parsed.success) return parsed.response;

  const late = await getLateClient();
  const { data, error } = await late.posts.createPost({
    body: {
      ...parsed.data,
      profileId,
    },
  });

  if (error) {
    return serverError(error, { action: "createPost", profileId });
  }

  return NextResponse.json(data);
}
