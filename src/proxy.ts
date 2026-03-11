import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/callback"];
const AUTH_PATHS = ["/login"];

/**
 * Clear all Supabase auth cookies from the response.
 * This prevents stale/corrupted cookies from trapping users in a
 * broken state where they can never load the app.
 */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  const authCookies = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-"));

  for (const cookie of authCookies) {
    response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
  }

  return response;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Skip auth refresh for the auth callback route — it exchanges the code itself
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session — 5s timeout to prevent hanging
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: { user: null }, error: new Error("Auth refresh timeout") }),
          5000
        )
      ),
    ]);

    const user = result?.data?.user ?? null;
    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

    // If user has auth cookies but getUser() returned null, cookies are stale/corrupted.
    // Clear them so the browser gets a clean state instead of being stuck.
    const hasAuthCookies = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-"));

    if (!user && hasAuthCookies) {
      clearAuthCookies(request, supabaseResponse);
    }

    // Redirect unauthenticated users away from protected routes
    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      // Clear stale cookies on the redirect too
      if (hasAuthCookies) {
        clearAuthCookies(request, redirectResponse);
      }
      return redirectResponse;
    }

    // Redirect authenticated users away from login page to dashboard
    if (isAuthPage && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch {
    // Auth refresh failed entirely — clear stale cookies so user can re-login cleanly
    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      clearAuthCookies(request, redirectResponse);
      return redirectResponse;
    }
    clearAuthCookies(request, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
