import { z } from "zod";

/**
 * Schema for updating a user (admin operation)
 */
export const UpdateUserSchema = z.object({
  subscription_status: z
    .enum(["active", "canceled", "past_due", "inactive"])
    .optional(),
  is_admin: z.boolean().optional(),
  accessible_profile_ids: z.array(z.string()).nullable().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

/**
 * Schema for user list filters (query params)
 */
export const UserFiltersSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["all", "active", "canceled", "past_due", "inactive"])
    .default("all"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type UserFilters = z.infer<typeof UserFiltersSchema>;

/**
 * Schema for signup chart query params
 */
export const SignupChartSchema = z.object({
  days: z.coerce.number().min(7).max(365).default(30),
});

export type SignupChartParams = z.infer<typeof SignupChartSchema>;
