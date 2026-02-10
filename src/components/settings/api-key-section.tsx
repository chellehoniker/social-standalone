"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Key, Copy, Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyState {
  hasApiKey: boolean;
  createdAt: string | null;
}

export function ApiKeySection() {
  const [state, setState] = useState<ApiKeyState | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch key status on first render
  const fetchStatus = useCallback(async () => {
    if (isFetched) return;
    try {
      const res = await fetch("/api/settings/api-key");
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // Silently fail — card will show generate button
    } finally {
      setIsFetched(true);
    }
  }, [isFetched]);

  // Trigger fetch on mount
  if (!isFetched) {
    fetchStatus();
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/api-key", { method: "POST" });
      if (res.status === 409) {
        toast.error("API key already exists. Revoke it first.");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to generate API key");
        return;
      }
      const data = await res.json();
      setNewKey(data.key);
      setState({ hasApiKey: true, createdAt: data.createdAt });
      toast.success("API key generated");
    } catch {
      toast.error("Failed to generate API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/api-key", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to revoke API key");
        return;
      }
      setState({ hasApiKey: false, createdAt: null });
      setNewKey(null);
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Key className="h-4 w-4" />
          API Key
        </CardTitle>
        <CardDescription>
          Use an API key to connect external tools like Make.com, Zapier, or n8n.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Newly generated key — shown only once */}
        {newKey && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950/30">
            <p className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Save this key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-yellow-100 px-3 py-2 text-xs font-mono break-all dark:bg-yellow-900/50 dark:text-yellow-100">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Key status */}
        {state?.hasApiKey ? (
          <div className="flex items-center justify-between rounded-lg bg-muted p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">API Key</span>
                <Badge variant="default" className="bg-green-600">Active</Badge>
              </div>
              {state.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(state.createdAt)}
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Revoke
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately disable the key. Any automations using
                    it will stop working. You can generate a new key afterward.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevoke}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Revoke Key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Key className="mr-2 h-4 w-4" />
            )}
            Generate API Key
          </Button>
        )}

        {/* Usage hint */}
        <p className="text-xs text-muted-foreground">
          Include the key in your automation requests as{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            Authorization: Bearer aa_sk_...
          </code>
        </p>
      </CardContent>
    </Card>
  );
}
