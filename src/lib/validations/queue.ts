/**
 * Queue Validation Schemas
 */

import { z } from "zod/v4";

const dayOfWeekEnum = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

/**
 * Schema for creating a new queue slot
 */
export const CreateQueueSlotSchema = z.object({
  dayOfWeek: dayOfWeekEnum,
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format"),
  accountIds: z.array(z.string()).min(1, "At least one account is required").optional(),
});

export type CreateQueueSlotInput = z.infer<typeof CreateQueueSlotSchema>;

/**
 * Schema for updating a queue slot
 */
export const UpdateQueueSlotSchema = z.object({
  queueId: z.string().min(1, "Queue ID is required"),
  dayOfWeek: dayOfWeekEnum.optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format").optional(),
  accountIds: z.array(z.string()).optional(),
});

export type UpdateQueueSlotInput = z.infer<typeof UpdateQueueSlotSchema>;
