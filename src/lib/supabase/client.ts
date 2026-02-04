import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { clientEnv } from "@/lib/env";

// Singleton pattern - reuse same client instance across all components
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  console.log("[Supabase] Creating client with URL:", clientEnv.supabaseUrl?.substring(0, 30) + "...");
  console.log("[Supabase] Anon key present:", !!clientEnv.supabaseAnonKey);

  if (!clientEnv.supabaseUrl || !clientEnv.supabaseAnonKey) {
    console.error("[Supabase] Missing environment variables!");
  }

  browserClient = createBrowserClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey
  );

  return browserClient;
}
