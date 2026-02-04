import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { clientEnv } from "@/lib/env";

// Singleton pattern - reuse same client instance across all components
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey
  );

  return browserClient;
}
