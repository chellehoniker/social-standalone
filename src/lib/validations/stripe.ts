/**
 * Stripe Validation Schemas
 */

import { z } from "zod/v4";

/**
 * Schema for checkout session creation
 */
export const CheckoutSessionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required").startsWith("price_", "Invalid price ID format"),
  email: z.string().email("Invalid email address"),
});

export type CheckoutSessionInput = z.infer<typeof CheckoutSessionSchema>;
