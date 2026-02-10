import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CallbackEntitySelection } from "./_components/callback-entity-selection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connecting Account...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Please wait...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * OAuth Callback Page — Server Component
 *
 * Handles two flows:
 * 1. Simple connections (connected=X) → server redirect to accounts page
 * 2. Entity selection (step=X) → render entity selector with URL data
 *
 * No client-side auth dependency. The proxy already verifies authentication
 * for /callback routes. Entities (LinkedIn orgs) are parsed directly from
 * URL parameters — no additional API calls needed.
 */
export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const getString = (key: string): string =>
    (typeof params[key] === "string" ? params[key] : "") as string;

  const error = getString("error");
  const connected = getString("connected");
  const platform = getString("platform");
  const step = getString("step");

  // Handle errors — redirect to accounts with error
  if (error) {
    redirect(`/dashboard/accounts?error=${encodeURIComponent(error)}`);
  }

  // Simple connections (Threads, TikTok, Bluesky, Twitter, Instagram, etc.)
  // Server redirect — no client JS needed, no auth race condition
  if (connected) {
    redirect(`/dashboard/accounts?connected=${encodeURIComponent(connected)}`);
  }

  // Entity selection (LinkedIn orgs, Facebook pages, Pinterest boards, etc.)
  if (step && platform) {
    // Parse entities from URL if available (LinkedIn passes orgs directly in callback URL)
    let urlEntities: Array<{ id: string; name: string; urn?: string; vanityName?: string }> = [];
    const organizationsRaw = getString("organizations");
    if (organizationsRaw) {
      try {
        // GetLate double-URL-encodes the JSON — decode once here (searchParams already decoded once)
        urlEntities = JSON.parse(decodeURIComponent(organizationsRaw));
      } catch {
        try {
          // Try without extra decode in case searchParams already fully decoded
          urlEntities = JSON.parse(organizationsRaw);
        } catch {
          // Will fall back to API fetch in client component
        }
      }
    }

    return (
      <Suspense fallback={<Loading />}>
        <CallbackEntitySelection
          platform={platform}
          step={step}
          profileId={getString("profileId")}
          tempToken={getString("tempToken")}
          connectToken={getString("connect_token")}
          pendingDataToken={getString("pendingDataToken")}
          userProfile={getString("userProfile")}
          urlEntities={urlEntities}
        />
      </Suspense>
    );
  }

  // Unknown callback — redirect to accounts
  redirect("/dashboard/accounts");
}
