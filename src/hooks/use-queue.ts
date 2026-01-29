import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLate } from "./use-late";
import { useCurrentProfileId } from "./use-profiles";

export const queueKeys = {
  all: ["queue"] as const,
  slots: (profileId: string) => ["queue", "slots", profileId] as const,
  preview: (profileId: string, count: number) =>
    ["queue", "preview", profileId, count] as const,
  nextSlot: (profileId: string) => ["queue", "nextSlot", profileId] as const,
};

export interface QueueSlot {
  dayOfWeek: number; // 0-6, Sunday = 0
  hour: number;
  minute: number;
}

/**
 * Hook to fetch queue slots
 */
export function useQueueSlots(profileId?: string) {
  const late = useLate();
  const currentProfileId = useCurrentProfileId();
  const targetProfileId = profileId || currentProfileId;

  return useQuery({
    queryKey: queueKeys.slots(targetProfileId || ""),
    queryFn: async () => {
      if (!late) throw new Error("Not authenticated");
      // Note: You may need to adjust this based on actual SDK method names
      const response = await fetch(
        `https://getlate.dev/api/v1/queue/slots?profileId=${targetProfileId}`,
        {
          headers: {
            Authorization: `Bearer ${late.apiKey}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch queue slots");
      return response.json();
    },
    enabled: !!late && !!targetProfileId,
  });
}

/**
 * Hook to preview upcoming queue times
 */
export function useQueuePreview(count = 10, profileId?: string) {
  const late = useLate();
  const currentProfileId = useCurrentProfileId();
  const targetProfileId = profileId || currentProfileId;

  return useQuery({
    queryKey: queueKeys.preview(targetProfileId || "", count),
    queryFn: async () => {
      if (!late) throw new Error("Not authenticated");
      const response = await fetch(
        `https://getlate.dev/api/v1/queue/preview?profileId=${targetProfileId}&count=${count}`,
        {
          headers: {
            Authorization: `Bearer ${late.apiKey}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch queue preview");
      return response.json();
    },
    enabled: !!late && !!targetProfileId,
  });
}

/**
 * Hook to get the next available queue slot
 */
export function useNextQueueSlot(profileId?: string) {
  const late = useLate();
  const currentProfileId = useCurrentProfileId();
  const targetProfileId = profileId || currentProfileId;

  return useQuery({
    queryKey: queueKeys.nextSlot(targetProfileId || ""),
    queryFn: async () => {
      if (!late) throw new Error("Not authenticated");
      const response = await fetch(
        `https://getlate.dev/api/v1/queue/next-slot?profileId=${targetProfileId}`,
        {
          headers: {
            Authorization: `Bearer ${late.apiKey}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch next slot");
      return response.json();
    },
    enabled: !!late && !!targetProfileId,
  });
}

/**
 * Hook to update queue slots
 */
export function useUpdateQueueSlots() {
  const late = useLate();
  const queryClient = useQueryClient();
  const currentProfileId = useCurrentProfileId();

  return useMutation({
    mutationFn: async ({
      slots,
      profileId,
    }: {
      slots: QueueSlot[];
      profileId?: string;
    }) => {
      if (!late) throw new Error("Not authenticated");
      const targetProfileId = profileId || currentProfileId;

      const response = await fetch(
        `https://getlate.dev/api/v1/queue/slots?profileId=${targetProfileId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${late.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slots }),
        }
      );
      if (!response.ok) throw new Error("Failed to update queue slots");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Days of the week for display
 */
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Format a queue slot for display
 */
export function formatQueueSlot(slot: QueueSlot): string {
  const day = DAYS_OF_WEEK[slot.dayOfWeek];
  const hour = slot.hour.toString().padStart(2, "0");
  const minute = slot.minute.toString().padStart(2, "0");
  return `${day} at ${hour}:${minute}`;
}
