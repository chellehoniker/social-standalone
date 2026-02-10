"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { EntitySelector } from "./entity-selector";

interface Entity {
  id: string;
  name: string;
  picture?: string;
  urn?: string;
  vanityName?: string;
}

interface CallbackEntitySelectionProps {
  platform: string;
  step: string;
  profileId: string;
  tempToken: string;
  connectToken: string;
  pendingDataToken: string;
  userProfile: string;
  urlEntities: Entity[];
}

type Status = "loading" | "selecting" | "connecting" | "success" | "error";

/**
 * Entity selection for OAuth callbacks.
 *
 * No useAuth() dependency — the proxy already verified authentication.
 * For LinkedIn, organizations are passed as props (parsed from URL by server component).
 * For other platforms, fetches entities from the API.
 */
export function CallbackEntitySelection({
  platform,
  step,
  profileId,
  tempToken,
  connectToken,
  pendingDataToken,
  userProfile,
  urlEntities,
}: CallbackEntitySelectionProps) {
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntities() {
      // If entities were parsed from URL (LinkedIn), use them directly
      if (urlEntities.length > 0) {
        // Deduplicate by id
        const seen = new Set<string>();
        const unique = urlEntities.filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });

        // For LinkedIn, add personal account option
        if (platform === "linkedin") {
          unique.unshift({ id: "personal", name: "Personal Account" });
        }

        setEntities(unique);
        setStatus("selecting");
        return;
      }

      // Otherwise, fetch entities from API (Facebook pages, Pinterest boards, etc.)
      try {
        const params = new URLSearchParams({
          platform,
          stepType: step,
          ...(tempToken && { tempToken }),
          ...(connectToken && { connectToken }),
          ...(pendingDataToken && { pendingDataToken }),
        });

        const response = await fetch(`/api/late/connect/entities?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEntities(data.entities || []);
          setStatus("selecting");
        } else {
          throw new Error("Failed to load entities");
        }
      } catch (err) {
        console.error("Entity fetch error:", err);
        setError("Failed to load options. Please try again.");
        setStatus("error");
      }
    }

    loadEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEntitySelect = async (entityId: string) => {
    setStatus("connecting");

    try {
      const response = await fetch("/api/late/connect/select-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          entityId,
          profileId,
          tempToken,
          userProfile,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to select entity");
      }

      setStatus("success");
      toast.success("Account connected successfully!");
      setTimeout(() => router.push("/dashboard/accounts"), 1500);
    } catch (err) {
      console.error("Entity select error:", err);
      setError("Failed to complete connection. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === "loading" && "Loading..."}
            {status === "selecting" && "Select Account"}
            {status === "connecting" && "Connecting..."}
            {status === "success" && "Connected!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(status === "loading" || status === "connecting") && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Please wait...</p>
            </div>
          )}

          {status === "selecting" && (
            <EntitySelector
              platform={platform}
              entities={entities}
              onSelect={handleEntitySelect}
            />
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-muted-foreground">Redirecting to accounts...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{error}</p>
              <Button onClick={() => router.push("/dashboard/accounts")}>
                Back to Accounts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
