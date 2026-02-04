/**
 * Type Guards
 *
 * Runtime type checking utilities for safer type narrowing.
 */

import type { Platform } from "@/lib/late-api/types";
import { PLATFORMS } from "@/lib/late-api/types";

/**
 * Check if a value is a valid Platform
 */
export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Check if an object has a specific property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Check if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Stripe-specific type guards
 */
export const stripeGuards = {
  /**
   * Check if event data is a Checkout Session
   */
  isCheckoutSession(
    data: unknown
  ): data is {
    customer_email?: string | null;
    metadata?: Record<string, string | null>;
    customer?: string | null;
    subscription?: string | null;
  } {
    return isObject(data) && "object" in data;
  },

  /**
   * Check if event data is a Subscription
   */
  isSubscription(
    data: unknown
  ): data is {
    customer?: string | null;
    status?: string;
    items?: { data: Array<{ price: { id: string }; current_period_end: number }> };
  } {
    return isObject(data) && hasProperty(data, "items");
  },

  /**
   * Check if event data is an Invoice
   */
  isInvoice(
    data: unknown
  ): data is {
    customer?: string | null;
  } {
    return isObject(data) && hasProperty(data, "customer");
  },
};

/**
 * Late API type guards
 */
export const lateGuards = {
  /**
   * Check if an object is an Account with required fields
   */
  isAccount(
    obj: unknown
  ): obj is {
    _id: string;
    platform: Platform;
    profileId: string;
  } {
    return (
      isObject(obj) &&
      hasProperty(obj, "_id") &&
      isString(obj._id) &&
      hasProperty(obj, "platform") &&
      isPlatform(obj.platform)
    );
  },

  /**
   * Check if an object is a Post with required fields
   */
  isPost(
    obj: unknown
  ): obj is {
    _id: string;
    profileId: string;
    content?: string;
  } {
    return (
      isObject(obj) &&
      hasProperty(obj, "_id") &&
      isString(obj._id) &&
      hasProperty(obj, "profileId") &&
      isString(obj.profileId)
    );
  },
};
