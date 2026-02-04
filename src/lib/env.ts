/**
 * Environment Variable Validation
 *
 * Validates and exports typed environment variables.
 * Server-side vars are validated when accessed (lazy).
 * Client-side vars are validated at import time since they're bundled.
 */

/**
 * Client-side environment variables (NEXT_PUBLIC_*)
 * These are bundled at build time and available in the browser.
 */
function getClientEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const stripePriceMonthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
  const stripePriceAnnual = process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL;

  // In browser, these must be defined (bundled at build time)
  if (typeof window !== "undefined") {
    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
    }
    if (!supabaseAnonKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
    }
  }

  return {
    supabaseUrl: supabaseUrl || "",
    supabaseAnonKey: supabaseAnonKey || "",
    appUrl: appUrl || "http://localhost:3000",
    stripePriceMonthly: stripePriceMonthly || "",
    stripePriceAnnual: stripePriceAnnual || "",
  };
}

/**
 * Server-side environment variables
 * These are only available on the server and validated when accessed.
 */
function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be accessed in the browser");
  }

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const lateApiKey = process.env.LATE_API_KEY;

  return {
    supabaseServiceRoleKey: supabaseServiceRoleKey || "",
    stripeSecretKey: stripeSecretKey || "",
    stripeWebhookSecret: stripeWebhookSecret || "",
    lateApiKey: lateApiKey || "",
  };
}

/**
 * Validated client-side environment variables
 */
export const clientEnv = getClientEnv();

/**
 * Get validated server-side environment variables
 * Call this function only on the server.
 */
export function getServerConfig() {
  const server = getServerEnv();
  const client = getClientEnv();

  return {
    ...client,
    ...server,
  };
}

/**
 * Validate a specific server environment variable and throw if missing
 */
export function requireServerEnv(key: keyof ReturnType<typeof getServerEnv>): string {
  const value = getServerEnv()[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not configured`);
  }
  return value;
}

/**
 * Check if we're in a server environment
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}
