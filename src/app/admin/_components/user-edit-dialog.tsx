"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateUser } from "@/hooks/use-admin";
import type { Profile, SubscriptionStatus } from "@/lib/supabase/types";

interface UserEditDialogProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserEditDialogProps) {
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("inactive");
  const [isAdmin, setIsAdmin] = useState(false);

  const updateUser = useUpdateUser();

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setSubscriptionStatus(user.subscription_status);
      setIsAdmin(user.is_admin || false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateUser.mutateAsync({
        userId: user.id,
        data: {
          subscription_status: subscriptionStatus,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Subscription Status */}
          <div className="space-y-2">
            <Label htmlFor="subscription-status">Subscription Status</Label>
            <Select
              value={subscriptionStatus}
              onValueChange={(value) =>
                setSubscriptionStatus(value as SubscriptionStatus)
              }
            >
              <SelectTrigger id="subscription-status">
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

          {/* Admin Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is-admin">Admin Access</Label>
              <p className="text-xs text-muted-foreground">
                Grant admin privileges to this user
              </p>
            </div>
            <Switch
              id="is-admin"
              checked={isAdmin}
              onCheckedChange={setIsAdmin}
            />
          </div>

          {/* Read-only info */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">User ID:</span> {user.id}
            </p>
            {user.stripe_customer_id && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Stripe:</span>{" "}
                {user.stripe_customer_id}
              </p>
            )}
            {user.getlate_profile_id && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">GetLate:</span>{" "}
                {user.getlate_profile_id}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
