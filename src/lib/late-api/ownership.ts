/**
 * Post ownership verification for multi-tenant isolation.
 *
 * The Late API doesn't set a top-level profileId on posts created via the SDK.
 * Instead, ownership is determined by the profile that owns the connected accounts.
 * Each platform entry in a post has a profileId (either directly or via the
 * populated accountId object) that indicates which profile owns that account.
 */

/**
 * Check if a post belongs to the given profile.
 * Checks platforms[].profileId and platforms[].accountId.profileId.
 */
export function postBelongsToProfile(post: any, profileId: string): boolean {
  if (!post?.platforms?.length) return false;
  return post.platforms.some((p: any) => {
    if (p.profileId === profileId) return true;
    if (typeof p.accountId === "object" && p.accountId?.profileId === profileId) return true;
    return false;
  });
}
