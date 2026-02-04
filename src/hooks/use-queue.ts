import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export const queueKeys = {
  all: ["queue"] as const,
  queues: () => ["queue", "queues"] as const,
  slots: () => ["queue", "slots"] as const,
  preview: (count: number) => ["queue", "preview", count] as const,
  nextSlot: () => ["queue", "nextSlot"] as const,
};

// SDK-aligned types
export interface QueueSlot {
  dayOfWeek: number; // 0-6, Sunday = 0
  time?: string; // "HH:mm" format (preferred)
  hour?: number; // Legacy: 0-23
  minute?: number; // Legacy: 0-59
}

export interface QueueSchedule {
  _id?: string;
  profileId?: string;
  name?: string;
  timezone?: string;
  slots?: QueueSlot[];
  active?: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  nextSlots?: string[]; // Computed upcoming slot times as ISO strings
}

// Helper functions for time conversion
export function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

export function getSlotTime(slot: QueueSlot): string {
  if (slot.time) return slot.time;
  if (typeof slot.hour === "number" && typeof slot.minute === "number") {
    return formatTime(slot.hour, slot.minute);
  }
  return "00:00";
}

export function normalizeSlot(slot: QueueSlot): QueueSlot {
  return { dayOfWeek: slot.dayOfWeek, time: getSlotTime(slot) };
}

/**
 * Hook to fetch all queues for a profile
 */
export function useQueues() {
  const { isAuthenticated, getlateProfileId } = useAuth();

  return useQuery({
    queryKey: queueKeys.queues(),
    queryFn: async () => {
      const response = await fetch("/api/late/queue?all=true");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch queues");
      }
      return response.json() as Promise<{ queues?: QueueSchedule[]; count?: number }>;
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to fetch queue slots
 */
export function useQueueSlots(queueId?: string) {
  const { isAuthenticated, getlateProfileId } = useAuth();

  return useQuery({
    queryKey: queueKeys.slots(),
    queryFn: async () => {
      const url = queueId ? `/api/late/queue?queueId=${queueId}` : "/api/late/queue";
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch queue slots");
      }
      return response.json() as Promise<{
        exists?: boolean;
        schedule?: QueueSchedule;
        nextSlots?: string[];
      }>;
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to preview upcoming queue times
 */
export function useQueuePreview(count = 10) {
  const { isAuthenticated, getlateProfileId } = useAuth();

  return useQuery({
    queryKey: queueKeys.preview(count),
    queryFn: async () => {
      const response = await fetch(`/api/late/queue/preview?count=${count}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch queue preview");
      }
      return response.json() as Promise<{
        profileId?: string;
        count?: number;
        slots?: string[];
      }>;
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to create a new queue
 */
export function useCreateQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      timezone,
      slots,
      active = true,
    }: {
      name: string;
      timezone: string;
      slots: QueueSlot[];
      active?: boolean;
    }) => {
      const response = await fetch("/api/late/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, slots, active }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create queue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to update queue slots
 */
export function useUpdateQueueSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slots,
      queueId,
      name,
      timezone,
      active,
      setAsDefault,
      reshuffleExisting,
    }: {
      slots: QueueSlot[];
      queueId?: string;
      name?: string;
      timezone?: string;
      active?: boolean;
      setAsDefault?: boolean;
      reshuffleExisting?: boolean;
    }) => {
      const response = await fetch("/api/late/queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId,
          name,
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          slots,
          active,
          setAsDefault,
          reshuffleExisting,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update queue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to update a queue
 */
export function useUpdateQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueId,
      name,
      timezone,
      slots,
      active,
      setAsDefault,
    }: {
      queueId: string;
      name?: string;
      timezone?: string;
      slots?: QueueSlot[];
      active?: boolean;
      setAsDefault?: boolean;
    }) => {
      const response = await fetch("/api/late/queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId,
          name,
          timezone,
          slots,
          active,
          setAsDefault,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update queue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to delete a queue
 */
export function useDeleteQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queueId }: { queueId: string }) => {
      const response = await fetch(`/api/late/queue/${queueId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete queue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Hook to toggle queue active status
 */
export function useToggleQueueActive() {
  const updateQueue = useUpdateQueue();

  return useMutation({
    mutationFn: async ({ queueId, active }: { queueId: string; active: boolean }) => {
      return updateQueue.mutateAsync({ queueId, active });
    },
  });
}

/**
 * Hook to set a queue as default
 */
export function useSetDefaultQueue() {
  const updateQueue = useUpdateQueue();

  return useMutation({
    mutationFn: async ({ queueId }: { queueId: string }) => {
      return updateQueue.mutateAsync({ queueId, setAsDefault: true });
    },
  });
}

/**
 * Hook to get the next available queue slot
 */
export function useNextQueueSlot(queueId?: string) {
  const { isAuthenticated, getlateProfileId } = useAuth();

  return useQuery({
    queryKey: queueKeys.nextSlot(),
    queryFn: async () => {
      const url = queueId
        ? `/api/late/queue/next?queueId=${queueId}`
        : "/api/late/queue/next";
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get next slot");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

// Days of the week for display
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAYS_OF_WEEK_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export function formatQueueSlot(slot: QueueSlot): string {
  const day = DAYS_OF_WEEK[slot.dayOfWeek];
  return `${day} at ${getSlotTime(slot)}`;
}

export {
  COMMON_TIMEZONES,
  getUserTimezone,
  getTimezoneOptions,
  formatTimezoneDisplay,
} from "@/lib/timezones";
