import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithProfile } from "@/lib/api/fetch-with-profile";

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  duration_days: number;
  platforms: string[];
  status: string;
  ai_provider_used: string | null;
  post_plan: any[] | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignPost {
  id: string;
  campaign_id: string;
  day_number: number;
  late_post_id: string | null;
  caption_variants: Record<string, string>;
  media_urls: Record<string, string>;
  music_url: string | null;
  status: string;
  scheduled_for: string | null;
  created_at: string;
}

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: () => ["campaigns", "list"] as const,
  detail: (id: string) => ["campaigns", id] as const,
};

export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.list(),
    queryFn: async () => {
      const res = await fetchWithProfile("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json() as Promise<{ campaigns: Campaign[] }>;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: async () => {
      const res = await fetchWithProfile(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json() as Promise<{ campaign: Campaign; posts: CampaignPost[] }>;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; objective: string; duration_days: number; platforms: string[] }) => {
      const res = await fetchWithProfile("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json() as Promise<{ campaign: Campaign }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetchWithProfile("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || "Failed to generate plan");
      }
      return res.json() as Promise<{ plan: any[]; postCount: number }>;
    },
    onSuccess: (_, campaignId) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

export function useGenerateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetchWithProfile(`/api/campaigns/${campaignId}/generate-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate media");
      return res.json() as Promise<{ total: number; completed: number; failed: number }>;
    },
    onSuccess: (_, campaignId) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

export function useScheduleCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      campaignId: string;
      startDate: string;
      timezone: string;
      scheduleMode: "spread" | "queue" | "custom";
      accountMap: Record<string, string>;
      postTimes?: string[];
    }) => {
      const res = await fetchWithProfile(`/api/campaigns/${params.campaignId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to schedule campaign");
      return res.json() as Promise<{ scheduled: number; failed: number; total: number }>;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(params.campaignId) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useUpdateCampaignPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { campaignId: string; postId: string; data: Record<string, unknown> }) => {
      const res = await fetchWithProfile(`/api/campaigns/${params.campaignId}/posts/${params.postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params.data),
      });
      if (!res.ok) throw new Error("Failed to update post");
      return res.json();
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(params.campaignId) });
    },
  });
}
