import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Protected routes - require authentication AND active subscription
  if (path.startsWith("/dashboard")) {
    if (!session) {
      // Not logged in - redirect to login
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(redirectUrl);
    }

    // Check subscription status
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, getlate_profile_id")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.subscription_status !== "active") {
      // No active subscription - redirect to pricing
      return NextResponse.redirect(new URL("/pricing", request.url));
    }

    if (!profile.getlate_profile_id) {
      // Profile not set up - this shouldn't happen normally
      // but handle it gracefully
      return NextResponse.redirect(new URL("/pricing", request.url));
    }
  }

  // Auth pages - redirect to dashboard if already logged in with active subscription
  if (path === "/login" || path === "/signup") {
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", session.user.id)
        .single();

      if (profile?.subscription_status === "active") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all dashboard routes
    "/dashboard/:path*",
    // Match auth pages
    "/login",
    "/signup",
    // Exclude static files and API routes (except those that need protection)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
