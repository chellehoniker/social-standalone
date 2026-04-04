"use client";

import { useMemo } from "react";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { isToday } from "date-fns/isToday";
import { isTomorrow } from "date-fns/isTomorrow";
import { isYesterday } from "date-fns/isYesterday";
import { useTheme } from "next-themes";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PostStatusBadge } from "@/components/posts";
import { cn } from "@/lib/utils";
import { getAccountColor, resolveAccountId } from "@/lib/account-colors";
import type { Platform } from "@/lib/late-api";
import { Clock, Video } from "lucide-react";

interface Post {
  _id: string;
  content: string;
  scheduledFor?: string;
  createdAt?: string;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  platforms: Array<{ platform: string; accountId?: string }>;
  mediaItems?: Array<{ type: "image" | "video"; url: string }>;
}

const formatDayHeader = (date: Date) => {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
};

interface CalendarListProps {
  currentDate: Date;
  posts: Post[];
  onPostClick: (postId: string) => void;
  statusFilter?: string;
}

export function CalendarList({
  currentDate,
  posts,
  onPostClick,
  statusFilter,
}: CalendarListProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isStatusFiltered = statusFilter && statusFilter !== "all";

  // Group posts by date
  const groupedPosts = useMemo(() => {
    if (isStatusFiltered) {
      // Status-filtered mode: use best available date, no month filtering, newest first
      const sorted = [...posts].sort((a, b) => {
        const dateA = a.scheduledFor || a.createdAt || "";
        const dateB = b.scheduledFor || b.createdAt || "";
        return dateB.localeCompare(dateA);
      });

      const groups: { date: Date; dateKey: string; posts: Post[] }[] = [];
      let currentGroup: { date: Date; dateKey: string; posts: Post[] } | null = null;

      sorted.forEach((post) => {
        const dateStr = post.scheduledFor || post.createdAt;
        if (!dateStr) return;
        const postDate = parseISO(dateStr);
        const dateKey = format(postDate, "yyyy-MM-dd");

        if (!currentGroup || currentGroup.dateKey !== dateKey) {
          currentGroup = { date: postDate, dateKey, posts: [] };
          groups.push(currentGroup);
        }
        currentGroup.posts.push(post);
      });

      return groups;
    }

    // Calendar mode: filter to current month, sort ascending
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const monthPosts = posts
      .filter((post) => {
        if (!post.scheduledFor) return false;
        const postDate = parseISO(post.scheduledFor);
        return postDate >= monthStart && postDate <= monthEnd;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.scheduledFor!);
        const dateB = parseISO(b.scheduledFor!);
        return dateA.getTime() - dateB.getTime();
      });

    const groups: { date: Date; dateKey: string; posts: Post[] }[] = [];
    let currentGroup: { date: Date; dateKey: string; posts: Post[] } | null = null;

    monthPosts.forEach((post) => {
      const postDate = parseISO(post.scheduledFor!);
      const dateKey = format(postDate, "yyyy-MM-dd");

      if (!currentGroup || currentGroup.dateKey !== dateKey) {
        currentGroup = { date: postDate, dateKey, posts: [] };
        groups.push(currentGroup);
      }
      currentGroup.posts.push(post);
    });

    return groups;
  }, [posts, currentDate, isStatusFiltered]);

  if (groupedPosts.length === 0) {
    const emptyMessages: Record<string, { title: string; subtitle: string }> = {
      failed: { title: "No failed posts", subtitle: "Everything published successfully!" },
      published: { title: "No published posts yet", subtitle: "Posts will appear here after they publish." },
      scheduled: { title: "No scheduled posts", subtitle: "Create a post to get started." },
      drafts: { title: "No campaign drafts", subtitle: "Create a campaign to generate content." },
    };
    const msg = (isStatusFiltered && emptyMessages[statusFilter!]) || {
      title: `No posts for ${format(currentDate, "MMMM yyyy")}`,
      subtitle: "Create a post to see it here",
    };

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {msg.title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {msg.subtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {groupedPosts.map(({ date, dateKey, posts: dayPosts }) => (
        <div key={dateKey}>
          {/* Day header */}
          <div
            className={cn(
              "sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-2",
              isToday(date) && "bg-primary/10"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-sm font-medium",
                  isToday(date) && "text-primary"
                )}
              >
                {formatDayHeader(date)}
              </span>
              <span className="text-xs text-muted-foreground">
                {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
              </span>
            </div>
          </div>

          {/* Posts for this day */}
          <div className="divide-y divide-border/50">
            {dayPosts.map((post) => {
              const accountId = resolveAccountId(post.platforms[0]?.accountId);
              const borderColor = accountId
                ? getAccountColor(accountId, isDark)
                : undefined;
              return (
              <button
                key={post._id}
                onClick={() => onPostClick(post._id)}
                className="flex w-full gap-3 border-l-3 p-4 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                style={borderColor ? { borderLeftColor: borderColor } : { borderLeftColor: "transparent" }}
              >
                {/* Thumbnail - only show if media exists */}
                {post.mediaItems?.[0] && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={post.mediaItems[0].url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {post.mediaItems[0].type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {post.mediaItems.length > 1 && (
                      <div className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
                        +{post.mediaItems.length - 1}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm">
                      {post.content || "(No content)"}
                    </p>
                    <PostStatusBadge status={post.status} />
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    {/* Time */}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {post.scheduledFor
                        ? format(parseISO(post.scheduledFor), "h:mm a")
                        : post.createdAt
                          ? format(parseISO(post.createdAt), "h:mm a")
                          : ""}
                    </span>

                    {/* Platforms */}
                    <div className="flex items-center gap-1">
                      {post.platforms.slice(0, 4).map((p, i) => (
                        <PlatformIcon
                          key={i}
                          platform={p.platform as Platform}
                          size="xs"
                          showColor
                        />
                      ))}
                      {post.platforms.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.platforms.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
