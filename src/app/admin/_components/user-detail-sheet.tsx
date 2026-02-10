"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, User, CreditCard, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateUser } from "@/hooks/use-admin";
import type { Profile, SubscriptionStatus } from "@/lib/supabase/types";

interface UserDetailSheetProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserDetailSheetProps) {
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("inactive");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState("");
  const [getlateProfileId, setGetlateProfileId] = useState("");
  const [accessibleProfileIds, setAccessibleProfileIds] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const updateUser = useUpdateUser();

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setSubscriptionStatus(user.subscription_status);
      setCurrentPeriodEnd(
        user.current_period_end
          ? toDatetimeLocal(user.current_period_end)
          : ""
      );
      setGetlateProfileId(user.getlate_profile_id || "");
      setAccessibleProfileIds(
        user.accessible_profile_ids?.join(", ") || ""
      );
      setIsAdmin(user.is_admin || false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    const profileIds = accessibleProfileIds
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    try {
      await updateUser.mutateAsync({
        userId: user.id,
        data: {
          email: email !== user.email ? email : undefined,
          subscription_status: subscriptionStatus,
          current_period_end: currentPeriodEnd
            ? new Date(currentPeriodEnd).toISOString()
            : null,
          getlate_profile_id: getlateProfileId || null,
          accessible_profile_ids:
            profileIds.length > 0 ? profileIds : null,
          is_admin: isAdmin,
        },
      });
      toast.success("User updated successfully");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* User Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">User Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-email">Email</Label>
              <Input
                id="detail-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
              <p>
                <span className="font-medium">User ID:</span>{" "}
                <span className="font-mono">{user.id}</span>
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {formatDate(user.created_at)}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {formatDate(user.updated_at)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Subscription */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Subscription</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-status">Status</Label>
              <Select
                value={subscriptionStatus}
                onValueChange={(v) =>
                  setSubscriptionStatus(v as SubscriptionStatus)
                }
              >
                <SelectTrigger id="detail-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-period-end">Period End</Label>
              <div className="flex gap-2">
                <Input
                  id="detail-period-end"
                  type="datetime-local"
                  value={currentPeriodEnd}
                  onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                  className="flex-1"
                />
                {currentPeriodEnd && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPeriodEnd("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Empty = no expiration. Set for trials or temporary access.
              </p>
            </div>

            {(user.stripe_customer_id ||
              user.subscription_id ||
              user.price_id) && (
              <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                {user.stripe_customer_id && (
                  <p>
                    <span className="font-medium">Stripe Customer:</span>{" "}
                    <span className="font-mono">
                      {user.stripe_customer_id}
                    </span>
                  </p>
                )}
                {user.subscription_id && (
                  <p>
                    <span className="font-medium">Subscription:</span>{" "}
                    <span className="font-mono">{user.subscription_id}</span>
                  </p>
                )}
                {user.price_id && (
                  <p>
                    <span className="font-medium">Price:</span>{" "}
                    <span className="font-mono">{user.price_id}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* GetLate Profiles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">GetLate Profiles</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-profile-id">Primary Profile ID</Label>
              <Input
                id="detail-profile-id"
                placeholder="GetLate profile ID"
                value={getlateProfileId}
                onChange={(e) => setGetlateProfileId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-accessible">
                Accessible Profiles (Pen Names)
              </Label>
              <Textarea
                id="detail-accessible"
                placeholder="Comma-separated profile IDs"
                value={accessibleProfileIds}
                onChange={(e) => setAccessibleProfileIds(e.target.value)}
                className="min-h-[60px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Additional profile IDs this user can switch to.
              </p>
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Permissions</h3>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="detail-admin">Admin Access</Label>
                <p className="text-xs text-muted-foreground">
                  Grant full admin privileges
                </p>
              </div>
              <Switch
                id="detail-admin"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
