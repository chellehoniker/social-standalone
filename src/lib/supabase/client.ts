import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { clientEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabaseAnonKey
  );
}
