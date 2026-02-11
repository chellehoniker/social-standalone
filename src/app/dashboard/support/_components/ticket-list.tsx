"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox } from "lucide-react";
import type { SupportTicket } from "@/lib/supabase/types";

const categoryLabels: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General",
};

const statusStyles: Record<string, string> = {
  open: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  in_progress: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  resolved: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

interface TicketListProps {
  refreshKey: number;
}

export function TicketList({ refreshKey }: TicketListProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/support/tickets");
        if (response.ok) {
          const data = await response.json();
          setTickets(data.tickets || []);
        }
      } catch {
        // Silently fail — empty list is fine
      } finally {
        setIsLoading(false);
      }
    }
    fetchTickets();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-sm font-medium">No tickets yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tickets you submit will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your submitted tickets and their current status.
      </p>
      <div className="divide-y divide-border rounded-lg border border-border">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{ticket.subject}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {categoryLabels[ticket.category] || ticket.category}
                  {" \u00b7 "}
                  {new Date(ticket.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${statusStyles[ticket.status] || ""}`}
              >
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticket.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
