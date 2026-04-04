"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns/format";
import { addMonths } from "date-fns/addMonths";
import { subMonths } from "date-fns/subMonths";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { usePosts, useDeletePost, useUpdatePost, useUnpublishPost, useRetryPost } from "@/hooks";
import type { PostFilters } from "@/hooks/use-posts";
import { useCampaignDrafts, type CampaignDraft } from "@/hooks/use-campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PostCard } from "@/components/posts";
import { StandaloneProfileSwitcher } from "@/components/profile-switcher-standalone";
import { AccountFilter } from "./_components/account-filter";
import { CalendarGrid } from "./_components/calendar-grid";
import { CalendarList } from "./_components/calendar-list";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  List,
  Grid3X3,
} from "lucide-react";
import { toast } from "sonner";

type ViewMode = "list" | "grid";
type PostStatusFilter = "all" | "scheduled" | "published" | "failed" | "drafts";

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageInner />
    </Suspense>
  );
}

function CalendarPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = (searchParams.get("status") as PostStatusFilter) || "all";
  const isStatusFiltered = statusFilter !== "all";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterAccountIds, setFilterAccountIds] = useState<string[]>([]);

  // Default to list on mobile, grid on desktop (but always list when status-filtered)
  useEffect(() => {
    if (isStatusFiltered) return;
    const isMobile = window.innerWidth < 768;
    setViewMode(isMobile ? "list" : "grid");
  }, [isStatusFiltered]);

  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();
  const unpublishMutation = useUnpublishPost();
  const retryMutation = useRetryPost();

  // Fetch posts: date-range for calendar, status for filtered, or campaign drafts
  const dateFrom = format(subMonths(startOfMonth(currentDate), 1), "yyyy-MM-dd");
  const dateTo = format(addMonths(endOfMonth(currentDate), 1), "yyyy-MM-dd");
  const isDraftsView = statusFilter === "drafts";
  const isLateStatusFiltered = isStatusFiltered && !isDraftsView;

  const postsFilters: PostFilters = isLateStatusFiltered
    ? { status: statusFilter as "scheduled" | "published" | "failed", limit: 100 }
    : { dateFrom, dateTo, limit: 500 };

  const { data: postsData, isLoading: postsLoading } = usePosts(isDraftsView ? {} : postsFilters);
  const { data: draftsData, isLoading: draftsLoading } = useCampaignDrafts();

  const isLoading = isDraftsView ? draftsLoading : postsLoading;
  const posts = useMemo(() => {
    if (isDraftsView) {
      // Transform campaign drafts to look like posts for the list view
      return (draftsData?.posts || []).map((d: CampaignDraft) => ({
        _id: d.id,
        content: Object.values(d.caption_variants)[0] || "(No content)",
        scheduledFor: d.scheduled_for || undefined,
        createdAt: d.created_at,
        status: d.status as any,
        platforms: (d.campaign_platforms || []).map((p: string) => ({ platform: p })),
        mediaItems: Object.values(d.media_urls || {}).filter(Boolean).slice(0, 1).map((url: string) => ({ type: "image" as const, url })),
        // Campaign draft metadata
        _campaignDraft: d,
      }));
    }
    return (postsData?.posts || []) as any[];
  }, [isDraftsView, draftsData, postsData]);

  const filteredPosts = useMemo(() => {
    if (filterAccountIds.length === 0) return posts;
    return posts.filter((p: any) =>
      p.platforms?.some((pl: any) => filterAccountIds.includes(pl.accountId))
    );
  }, [posts, filterAccountIds]);

  const selectedPost = useMemo(
    () => posts.find((p: any) => p._id === selectedPostId),
    [posts, selectedPostId]
  );

  const handlePrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.replace(`/dashboard/calendar${params.size ? `?${params}` : ""}`);
  };

  const handleReschedule = async (postId: string, newScheduledFor: string) => {
    try {
      await updateMutation.mutateAsync({ postId, scheduledFor: newScheduledFor });
      toast.success("Post rescheduled");
    } catch {
      toast.error("Failed to reschedule post");
    }
  };

  const handleRetry = async (postId: string) => {
    try {
      await retryMutation.mutateAsync(postId);
      toast.success("Post queued for retry");
    } catch {
      toast.error("Failed to retry post");
    }
  };

  const handleUnpublish = async (postId: string) => {
    try {
      await unpublishMutation.mutateAsync(postId);
      toast.success("Post unpublished from platform");
      setSelectedPostId(null);
    } catch {
      toast.error("Failed to unpublish post");
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;
    try {
      await deleteMutation.mutateAsync(postToDelete);
      toast.success("Post deleted");
      setPostToDelete(null);
      setSelectedPostId(null);
    } catch {
      toast.error("Failed to delete post");
    }
  };

  // Stats for the month (reflect active filter)
  const monthPosts = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return filteredPosts.filter((p: any) => {
      if (!p.scheduledFor) return false;
      const postDate = new Date(p.scheduledFor);
      return postDate >= monthStart && postDate <= monthEnd;
    });
  }, [filteredPosts, currentDate]);

  const scheduledCount = useMemo(
    () => monthPosts.filter((p: any) => p.status === "scheduled").length,
    [monthPosts]
  );
  const publishedCount = useMemo(
    () => monthPosts.filter((p: any) => p.status === "published").length,
    [monthPosts]
  );

  const statusLabels: Record<PostStatusFilter, string> = {
    all: "Calendar",
    scheduled: "Scheduled Posts",
    published: "Published Posts",
    failed: "Failed Posts",
    drafts: "Campaign Drafts",
  };

  const statusDescriptions: Record<PostStatusFilter, string> = {
    all: "View and manage your scheduled posts.",
    scheduled: "Your upcoming scheduled posts.",
    published: "Posts that have been published.",
    failed: "Posts that failed to publish. Click a post to retry.",
    drafts: "Campaign content waiting to be scheduled.",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{statusLabels[statusFilter]}</h1>
          <p className="text-muted-foreground">
            {statusDescriptions[statusFilter]}
          </p>
        </div>
        <StandaloneProfileSwitcher />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posts</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="drafts">Drafts</SelectItem>
                </SelectContent>
              </Select>

              {/* Month navigation — only shown in calendar mode */}
              {!isStatusFiltered && (
                <>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="min-w-32 text-center text-base font-semibold sm:min-w-36">
                    {format(currentDate, "MMMM yyyy")}
                  </h2>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="hidden h-8 sm:inline-flex" onClick={handleToday}>
                    Today
                  </Button>
                </>
              )}

              {/* Post count when status-filtered */}
              {isStatusFiltered && (
                <span className="text-sm text-muted-foreground">
                  {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle — only in calendar mode */}
              {!isStatusFiltered && (
                <div className="flex rounded-lg border border-border p-0.5">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Stats badges — only in calendar mode, hidden on mobile */}
              {!isStatusFiltered && (
                <>
                  <Badge variant="outline" className="hidden text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 sm:inline-flex">
                    {scheduledCount} scheduled
                  </Badge>
                  <Badge variant="outline" className="hidden text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 sm:inline-flex">
                    {publishedCount} published
                  </Badge>
                </>
              )}

              <Button size="sm" className="h-8" asChild>
                <Link href="/dashboard/compose">
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">New Post</span>
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Filter */}
      {!isStatusFiltered && (
        <AccountFilter
          filterAccountIds={filterAccountIds}
          onFilterChange={setFilterAccountIds}
        />
      )}

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            isStatusFiltered || viewMode === "list" ? <ListSkeleton /> : <CalendarSkeleton />
          ) : isStatusFiltered ? (
            <CalendarList
              currentDate={currentDate}
              posts={filteredPosts}
              onPostClick={setSelectedPostId}
              statusFilter={statusFilter}
            />
          ) : viewMode === "grid" ? (
            <CalendarGrid
              currentDate={currentDate}
              posts={filteredPosts}
              onPostClick={setSelectedPostId}
              onDayClick={() => {}}
              onPostReschedule={handleReschedule}
            />
          ) : (
            <CalendarList
              currentDate={currentDate}
              posts={filteredPosts}
              onPostClick={setSelectedPostId}
            />
          )}
        </CardContent>
      </Card>

      {/* Post detail dialog */}
      <Dialog
        open={!!selectedPostId}
        onOpenChange={() => setSelectedPostId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPost?._campaignDraft ? "Campaign Draft" : "Post Details"}</DialogTitle>
          </DialogHeader>
          {selectedPost && selectedPost._campaignDraft ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">{selectedPost.content || "(No content)"}</p>
                {selectedPost.mediaItems?.[0] && (
                  <img src={selectedPost.mediaItems[0].url} alt="" className="mt-3 rounded-lg max-h-48 object-cover" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Day {selectedPost._campaignDraft.day_number} &middot; {selectedPost._campaignDraft.campaign_name}</span>
                <Badge variant="outline">{selectedPost._campaignDraft.status === "ready" ? "Ready" : selectedPost._campaignDraft.status}</Badge>
              </div>
              <Button asChild className="w-full">
                <Link href={`/dashboard/create?id=${selectedPost._campaignDraft.campaign_id}`}>
                  Open Campaign to Schedule
                </Link>
              </Button>
            </div>
          ) : selectedPost ? (
            <PostCard
              post={selectedPost}
              onEdit={(_id) => {
                setSelectedPostId(null);
              }}
              onDelete={(id) => {
                setPostToDelete(id);
              }}
              onRetry={handleRetry}
              onUnpublish={handleUnpublish}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CalendarSkeleton() {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="animate-pulse">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton - 5 rows of 7 days */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className={`min-h-24 border-b border-r border-border p-1 ${
              index % 7 === 6 ? "border-r-0" : ""
            } ${index >= 28 ? "border-b-0" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-full bg-muted" />
            </div>
            {index % 3 === 0 && (
              <div className="mt-1 space-y-1">
                <div className="h-5 w-full rounded bg-muted" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-border">
      {[1, 2, 3].map((group) => (
        <div key={group}>
          {/* Day header skeleton */}
          <div className="bg-muted/50 px-4 py-2">
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          {/* Posts skeleton */}
          {[1, 2].map((post) => (
            <div key={post} className="flex gap-3 p-4">
              <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
