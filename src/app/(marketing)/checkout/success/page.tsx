"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fetchingSession, setFetchingSession] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      fetch(`/api/stripe/session?id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            setEmail(data.email);
          }
        })
        .catch(console.error)
        .finally(() => setFetchingSession(false));
    } else {
      setFetchingSession(false);
    }
  }, [searchParams]);

  const handleSendMagicLink = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to access your dashboard. The link
              expires in 1 hour.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Payment Successful!</CardTitle>
          <CardDescription>
            Your account is ready. Enter your email to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || fetchingSession}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleSendMagicLink}
            disabled={loading || fetchingSession}
          >
            {loading || fetchingSession ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send Magic Link"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Use the same email you used for payment
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
