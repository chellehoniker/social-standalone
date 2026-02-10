import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "./use-server-auth";
import { fetchWithProfile } from "@/lib/api/fetch-with-profile";
import type { Platform, PlatformSpecificData } from "@/lib/late-api";

export const postKeys = {
  all: ["posts"] as const,
  lists: () => ["posts", "list"] as const,
  list: (filters: PostFilters) => ["posts", "list", filters] as const,
  detail: (postId: string) => ["posts", "detail", postId] as const,
};

export interface PostFilters {
  status?: "draft" | "scheduled" | "publishing" | "published" | "failed";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface MediaItem {
  type: "image" | "video";
  url: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PlatformPost {
  platform: Platform;
  accountId: string;
  customContent?: string;
  platformSpecificData?: PlatformSpecificData;
}

export interface CreatePostInput {
  content: string;
  mediaItems?: MediaItem[];
  platforms: PlatformPost[];
  scheduledFor?: string;
  publishNow?: boolean;
  timezone?: string;
  queuedFromProfile?: string;
}

export interface UpdatePostInput {
  postId: string;
  content?: string;
  mediaItems?: MediaItem[];
  platforms?: PlatformPost[];
  scheduledFor?: string;
}

/**
 * Hook to fetch posts with filters
 */
export function usePosts(filters: PostFilters = {}) {
  const serverAuth = useServerAuth();
  const isAuthenticated = serverAuth?.isAuthenticated ?? false;
  const getlateProfileId = serverAuth?.getlateProfileId;

  const queryString = new URLSearchParams();
  if (filters.status) queryString.set("status", filters.status);
  if (filters.dateFrom) queryString.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) queryString.set("dateTo", filters.dateTo);
  if (filters.page) queryString.set("page", filters.page.toString());
  if (filters.limit) queryString.set("limit", filters.limit.toString());

  return useQuery({
    queryKey: postKeys.list(filters),
    queryFn: async () => {
      const url = `/api/late/posts${queryString.toString() ? `?${queryString}` : ""}`;
      const response = await fetchWithProfile(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch posts");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!getlateProfileId,
  });
}

/**
 * Hook to fetch a single post
 */
export function usePost(postId: string) {
  const serverAuth = useServerAuth();
  const isAuthenticated = serverAuth?.isAuthenticated ?? false;

  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: async () => {
      const response = await fetchWithProfile(`/api/late/posts/${postId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch post");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!postId,
  });
}

/**
 * Hook to create a post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await fetchWithProfile("/api/late/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to update a post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, ...input }: UpdatePostInput) => {
      const response = await fetchWithProfile(`/api/late/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update post");
      }
      return response.json();
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to delete a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetchWithProfile(`/api/late/posts/${postId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete post");
      }
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.removeQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to retry a failed post
 */
export function useRetryPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetchWithProfile(`/api/late/posts/${postId}/retry`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry post");
      }
      return response.json();
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to fetch posts for calendar view (by date range)
 */
export function useCalendarPosts(dateFrom: string, dateTo: string) {
  return usePosts({
    dateFrom,
    dateTo,
    limit: 500,
  });
}

/**
 * Hook to fetch scheduled posts
 */
export function useScheduledPosts(limit = 10) {
  return usePosts({
    status: "scheduled",
    limit,
  });
}

/**
 * Hook to fetch recent posts (published)
 */
export function useRecentPosts(limit = 10) {
  return usePosts({
    status: "published",
    limit,
  });
}
