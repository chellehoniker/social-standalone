"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useRequireServerAuth } from "@/hooks/use-server-auth";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores";
import { getTimezoneOptions } from "@/lib/timezones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CreditCard, Moon, Sun, Globe, LogOut, ExternalLink, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const serverAuth = useRequireServerAuth();
  const { timezone, setTimezone } = useAppStore();

  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Build profile-like object from server auth for display
  const profile = {
    subscription_status: serverAuth.subscriptionStatus,
    price_id: serverAuth.priceId,
    current_period_end: serverAuth.currentPeriodEnd,
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  // Compute timezone options - always includes user's browser timezone and current selection
  const timezoneOptions = useMemo(
    () => getTimezoneOptions(timezone),
    [timezone]
  );

  const handleLogout = () => {
    setIsSigningOut(true);
    signOut().finally(() => {
      // Use window.location for full page reload to clear all auth state
      window.location.href = "/";
    });
  };

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open subscription portal:", error);
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // Format the subscription status for display
  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="outline">Inactive</Badge>;
    }
  };

  // Get plan name from price ID
  const getPlanName = (priceId: string | null | undefined) => {
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL) {
      return "Annual Plan";
    }
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY) {
      return "Monthly Plan";
    }
    return "Subscription";
  };

  // Format next billing date
  const formatBillingDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{getPlanName(profile.price_id)}</span>
              {getStatusBadge(profile.subscription_status)}
            </div>
            {profile.current_period_end && (
              <div className="text-sm text-muted-foreground">
                {profile.subscription_status === "canceled" ? (
                  <>Access until {formatBillingDate(profile.current_period_end)}</>
                ) : (
                  <>Next billing date: {formatBillingDate(profile.current_period_end)}</>
                )}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={isManagingSubscription}
          >
            {isManagingSubscription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                Manage Subscription
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how Author Automations looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your default timezone for scheduling posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Default Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="h-4 w-4" />
            Session
          </CardTitle>
          <CardDescription>
            Manage your current session on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Sign Out</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;ll be signed out of Author Automations Social on this device.
                  You can sign back in anytime using your email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
                <Button
                  variant="default"
                  onClick={handleLogout}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    "Sign Out"
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Author Automations Social</p>
            <p className="mt-1">
              Social media scheduling for authors and creators.
            </p>
            <p className="mt-2">
              <a
                href="mailto:support@authorautomations.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
