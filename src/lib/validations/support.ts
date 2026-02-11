/**
 * Support Ticket Validation Schemas
 */

import { z } from "zod/v4";

export const CreateTicketSchema = z.object({
  category: z.enum(["bug", "feature", "general"], {
    error: "Category must be bug, feature, or general",
  }),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less"),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
