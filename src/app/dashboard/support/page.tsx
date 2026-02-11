"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, MessageSquarePlus, Inbox } from "lucide-react";
import { DocsContent } from "./_components/docs-content";
import { TicketForm } from "./_components/ticket-form";
import { TicketList } from "./_components/ticket-list";

export default function SupportPage() {
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground">
          Documentation, bug reports, and feature requests.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="docs">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="docs" className="text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Docs
              </TabsTrigger>
              <TabsTrigger value="submit" className="text-xs sm:text-sm">
                <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Submit Ticket
              </TabsTrigger>
              <TabsTrigger value="tickets" className="text-xs sm:text-sm">
                <Inbox className="h-3.5 w-3.5 mr-1.5 hidden sm:inline-block" />
                Your Tickets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docs" className="mt-6">
              <DocsContent />
            </TabsContent>

            <TabsContent value="submit" className="mt-6">
              <TicketForm
                onTicketCreated={() => setTicketRefreshKey((k) => k + 1)}
              />
            </TabsContent>

            <TabsContent value="tickets" className="mt-6">
              <TicketList refreshKey={ticketRefreshKey} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
