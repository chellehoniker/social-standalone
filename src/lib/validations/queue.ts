/**
 * Queue Validation Schemas
 */

import { z } from "zod/v4";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const queueSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(timeRegex, "Time must be in HH:mm format").optional(),
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
});

/**
 * Schema for creating a new queue.
 * Matches what the queue page hook (useCreateQueue) sends.
 */
export const CreateQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  slots: z.array(queueSlotSchema).default([]),
  active: z.boolean().optional().default(true),
});

export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;

/**
 * Schema for updating a queue (name, timezone, slots, active, etc.).
 * Matches what the queue page hooks (useUpdateQueue, useUpdateQueueSlots) send.
 */
export const UpdateQueueSchema = z.object({
  queueId: z.string().min(1, "Queue ID is required"),
  name: z.string().optional(),
  timezone: z.string().optional(),
  slots: z.array(queueSlotSchema).optional(),
  active: z.boolean().optional(),
  setAsDefault: z.boolean().optional(),
  reshuffleExisting: z.boolean().optional(),
});

export type UpdateQueueInput = z.infer<typeof UpdateQueueSchema>;

// Keep legacy names as aliases for backwards compatibility with any imports
export const CreateQueueSlotSchema = CreateQueueSchema;
export type CreateQueueSlotInput = CreateQueueInput;
export const UpdateQueueSlotSchema = UpdateQueueSchema;
export type UpdateQueueSlotInput = UpdateQueueInput;
