import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { clientEnv, requireServerEnv } from "@/lib/env";

/**
 * Creates a Supabase client for server-side usage (API routes, server components)
 * Uses cookies to maintain session state
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with service role key
 * Use this for admin operations that bypass RLS (webhooks, background jobs)
 * WARNING: Never expose this client to the browser
 */
export function createServiceClient() {
  return createServerClient<Database>(
    clientEnv.supabaseUrl,
    requireServerEnv("supabaseServiceRoleKey"),
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );
}
