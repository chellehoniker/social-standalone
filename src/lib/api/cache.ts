/**
 * Cache Control Utilities
 *
 * Helpers for setting appropriate cache headers on API responses.
 */

import { NextResponse } from "next/server";

/**
 * Cache duration constants in seconds
 */
export const CacheDuration = {
  /** No caching - for mutations and sensitive data */
  NONE: 0,
  /** Short cache - for frequently changing data (30s) */
  SHORT: 30,
  /** Medium cache - for relatively stable data (5m) */
  MEDIUM: 300,
  /** Long cache - for static data (1h) */
  LONG: 3600,
} as const;

/**
 * Create cache headers with stale-while-revalidate pattern
 */
export function cacheHeaders(
  maxAge: number,
  staleWhileRevalidate?: number
): HeadersInit {
  if (maxAge === 0) {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };
  }

  const swr = staleWhileRevalidate ?? maxAge;
  return {
    "Cache-Control": `private, max-age=${maxAge}, stale-while-revalidate=${swr}`,
  };
}

/**
 * Create a cached JSON response
 */
export function jsonWithCache<T>(
  data: T,
  maxAge: number = CacheDuration.SHORT,
  options?: {
    staleWhileRevalidate?: number;
    status?: number;
  }
): NextResponse<T> {
  return NextResponse.json(data, {
    status: options?.status ?? 200,
    headers: cacheHeaders(maxAge, options?.staleWhileRevalidate),
  });
}

/**
 * Create a no-cache JSON response (for mutations)
 */
export function jsonNoCache<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, {
    status,
    headers: cacheHeaders(CacheDuration.NONE),
  });
}
