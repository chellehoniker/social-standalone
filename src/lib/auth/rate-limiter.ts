const MAX_REQUESTS = 100;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 10_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for a user. Returns null if allowed,
 * or { resetAt } if rate limited.
 */
export function checkRateLimit(userId: string): { resetAt: number } | null {
  const now = Date.now();

  // Auto-cleanup when cache gets too large
  if (store.size > MAX_ENTRIES) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  const entry = store.get(userId);

  // No existing entry or window expired — start fresh
  if (!entry || entry.resetAt <= now) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  // Within window — check count
  if (entry.count >= MAX_REQUESTS) {
    return { resetAt: entry.resetAt };
  }

  entry.count++;
  return null;
}
