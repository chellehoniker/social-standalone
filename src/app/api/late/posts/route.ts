import { NextRequest, NextResponse } from "next/server";
import { validateTenant, isValidationError } from "@/lib/auth/validate-tenant";

/**
 * GET /api/late/posts
 * Returns posts for the tenant's profile
 */
export async function GET(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const searchParams = request.nextUrl.searchParams;

  const { default: Late } = await import("@getlatedev/node");
  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
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
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/**
 * POST /api/late/posts
 * Creates a new post
 */
export async function POST(request: NextRequest) {
  const validation = await validateTenant();
  if (isValidationError(validation)) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { profileId } = validation;
  const body = await request.json();

  const { default: Late } = await import("@getlatedev/node");
  const late = new Late({ apiKey: process.env.LATE_API_KEY! });
  const { data, error } = await late.posts.createPost({
    body: {
      ...body,
      profileId,
    },
  });

  if (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
