import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithProfile } from "@/lib/api/fetch-with-profile";

export interface AISettings {
  ai_enabled: boolean;
  openai_key: string | null;
  anthropic_key: string | null;
  gemini_key: string | null;
  freepik_key: string | null;
  preferred_ai_provider: "openai" | "anthropic" | "gemini";
  freepik_image_model: string;
  freepik_video_model: string;
  image_style_prompt: string | null;
  prose_guide: string | null;
  brand_guide: string | null;
  copywriting_guide: string | null;
  social_media_guide: string | null;
}

export const aiSettingsKeys = {
  all: ["ai-settings"] as const,
  detail: () => ["ai-settings", "detail"] as const,
};

export function useAISettings() {
  return useQuery({
    queryKey: aiSettingsKeys.detail(),
    queryFn: async (): Promise<AISettings> => {
      const response = await fetchWithProfile("/api/settings/ai");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch AI settings");
      }
      return response.json();
    },
  });
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AISettings>) => {
      const response = await fetchWithProfile("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update AI settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsKeys.all });
    },
  });
}
