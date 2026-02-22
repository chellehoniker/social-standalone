import { useMutation } from "@tanstack/react-query";
import { fetchWithProfile } from "@/lib/api/fetch-with-profile";

interface PrivateReplyInput {
  postId: string;
  commentId: string;
  accountId: string;
  message: string;
}

/**
 * Hook to send a private reply to a comment (Facebook or Instagram).
 * One private reply per comment, 7-day window from original comment.
 */
export function usePrivateReply() {
  return useMutation({
    mutationFn: async ({ postId, commentId, accountId, message }: PrivateReplyInput) => {
      const response = await fetchWithProfile(
        `/api/late/inbox/comments/${postId}/${commentId}/private-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, message }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send private reply");
      }
      return response.json();
    },
  });
}
