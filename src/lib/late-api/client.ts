/**
 * Late API Client Singleton
 *
 * Provides a lazy-initialized singleton client for the GetLate API.
 * Uses dynamic imports to avoid build-time env var checks.
 */

import type Late from "@getlatedev/node";

// Singleton instance
let clientInstance: Late | null = null;
let clientPromise: Promise<Late> | null = null;

/**
 * Error class for Late API errors with additional context
 */
export class LateApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "LateApiError";
  }
}

/**
 * Get the Late API client singleton.
 * Uses lazy initialization with dynamic import to avoid build-time env var checks.
 *
 * @returns Promise<Late> - The Late client instance
 * @throws LateApiError if LATE_API_KEY is not configured
 */
export async function getLateClient(): Promise<Late> {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance;
  }

  // Return existing promise if initialization is in progress
  if (clientPromise) {
    return clientPromise;
  }

  // Initialize the client
  clientPromise = initializeClient();

  try {
    clientInstance = await clientPromise;
    return clientInstance;
  } catch (error) {
    // Reset promise on failure so retry is possible
    clientPromise = null;
    throw error;
  }
}

/**
 * Initialize the Late client with dynamic import
 */
async function initializeClient(): Promise<Late> {
  const apiKey = process.env.LATE_API_KEY;

  if (!apiKey) {
    throw new LateApiError(
      "LATE_API_KEY environment variable is not configured",
      "MISSING_API_KEY",
      500
    );
  }

  if (!apiKey.startsWith("sk_")) {
    throw new LateApiError(
      "LATE_API_KEY appears to be invalid (should start with sk_)",
      "INVALID_API_KEY",
      500
    );
  }

  const { default: Late } = await import("@getlatedev/node");
  return new Late({ apiKey });
}

/**
 * Execute a Late API operation with error handling and optional retry
 *
 * @param operation - Async function that performs the API operation
 * @param context - Context info for error logging (e.g., { action: "listPosts", profileId })
 * @param options - Options for retry behavior
 * @returns The result of the operation
 */
export async function withLateClient<T>(
  operation: (client: Late) => Promise<T>,
  context: Record<string, unknown> = {},
  options: { retries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { retries = 2, retryDelay = 1000 } = options;

  const client = await getLateClient();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation(client);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx)
      if (isClientError(error)) {
        throw wrapError(lastError!, context);
      }

      // Retry on server errors (5xx) or network errors
      if (attempt < retries) {
        console.warn(
          `[Late API] Retry ${attempt + 1}/${retries} for ${JSON.stringify(context)}:`,
          lastError.message
        );
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
      }
    }
  }

  throw wrapError(lastError!, context);
}

/**
 * Check if error is a client error (4xx) that shouldn't be retried
 */
function isClientError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return statusCode !== undefined && statusCode >= 400 && statusCode < 500;
  }
  return false;
}

/**
 * Wrap an error with additional context
 */
function wrapError(error: Error, context: Record<string, unknown>): LateApiError {
  if (error instanceof LateApiError) {
    return new LateApiError(
      error.message,
      error.code,
      error.statusCode,
      { ...error.context, ...context }
    );
  }

  const statusCode = (error as { statusCode?: number }).statusCode || 500;
  const code = (error as { code?: string }).code || "LATE_API_ERROR";

  return new LateApiError(error.message, code, statusCode, context);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset the client singleton (useful for testing)
 */
export function resetLateClient(): void {
  clientInstance = null;
  clientPromise = null;
}
