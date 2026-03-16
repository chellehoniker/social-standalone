"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Inbox,
  Loader2,
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SupportTicket, TicketStatus, TicketCategory } from "@/lib/supabase/types";

const categoryConfig: Record<
  TicketCategory,
  { label: string; icon: typeof Bug; className: string }
> = {
  bug: {
    label: "Bug Report",
    icon: Bug,
    className: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  },
  feature: {
    label: "Feature Request",
    icon: Lightbulb,
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
  },
  general: {
    label: "General",
    icon: HelpCircle,
    className:
      "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
  },
};

const statusConfig: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground",
  },
};

interface TicketsResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminTicketsPage() {
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<TicketStatus>("open");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      params.set("page", page.toString());
      params.set("limit", "25");

      const response = await fetch(`/api/admin/tickets?${params}`, {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch {
      toast.error("Failed to fetch tickets");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditNotes(ticket.admin_notes || "");
    setSheetOpen(true);
  };

  const saveTicket = async () => {
    if (!selectedTicket) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/admin/tickets/${selectedTicket.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editStatus,
            admin_notes: editNotes,
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Ticket updated");
        setSheetOpen(false);
        fetchTickets();
      } else {
        toast.error("Failed to update ticket");
      }
    } catch {
      toast.error("Failed to update ticket");
    } finally {
      setIsSaving(false);
    }
  };

  const tickets = data?.tickets || [];
  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} total tickets
            {statusFilter === "all" && openCount > 0 && (
              <span className="ml-1">
                ({openCount} open)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="bug">Bug Reports</SelectItem>
            <SelectItem value="feature">Feature Requests</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-sm font-medium">No tickets found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try changing your filters."
                  : "No support tickets have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {tickets.map((ticket) => {
                const cat = categoryConfig[ticket.category];
                const stat = statusConfig[ticket.status];
                const CatIcon = cat.icon;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => openTicket(ticket)}
                    className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cat.className}`}
                    >
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium truncate">
                            {ticket.subject}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ticket.email}
                            {" \u00b7 "}
                            {new Date(ticket.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${stat.className}`}
                        >
                          {stat.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTicket && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">
                  {selectedTicket.subject}
                </SheetTitle>
                <SheetDescription className="text-left">
                  From {selectedTicket.email} on{" "}
                  {new Date(selectedTicket.created_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Category & Status */}
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={
                      categoryConfig[selectedTicket.category].className
                    }
                  >
                    {categoryConfig[selectedTicket.category].label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={statusConfig[selectedTicket.status].className}
                  >
                    {statusConfig[selectedTicket.status].label}
                  </Badge>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>

                <Separator />

                {/* Admin Actions */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Update Ticket</h4>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Status
                    </label>
                    <Select
                      value={editStatus}
                      onValueChange={(v) =>
                        setEditStatus(v as TicketStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">
                          In Progress
                        </SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      Admin Notes
                    </label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Internal notes about this ticket..."
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={saveTicket}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
