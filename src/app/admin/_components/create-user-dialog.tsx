"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateUser } from "@/hooks/use-admin";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ProfileType = "new" | "existing" | "none";
type SubscriptionType = "active" | "trial" | "inactive";

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [profileType, setProfileType] = useState<ProfileType>("new");
  const [existingProfileId, setExistingProfileId] = useState("");
  const [subscriptionType, setSubscriptionType] =
    useState<SubscriptionType>("trial");
  const [isAdmin, setIsAdmin] = useState(false);

  const createUser = useCreateUser();

  const resetForm = () => {
    setEmail("");
    setProfileType("new");
    setExistingProfileId("");
    setSubscriptionType("trial");
    setIsAdmin(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createUser.mutateAsync({
        email,
        profile_type: profileType,
        existing_profile_id:
          profileType === "existing" ? existingProfileId : undefined,
        subscription_type: subscriptionType,
        is_admin: isAdmin,
      });

      toast.success(`User ${email} created successfully`);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a user account with optional GetLate profile and subscription
            access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="create-email">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Profile Type */}
            <div className="space-y-3">
              <Label>GetLate Profile</Label>
              <RadioGroup
                value={profileType}
                onValueChange={(v) => setProfileType(v as ProfileType)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="profile-new" />
                  <Label htmlFor="profile-new" className="font-normal">
                    Create new profile
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="profile-existing" />
                  <Label htmlFor="profile-existing" className="font-normal">
                    Use existing profile ID
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="profile-none" />
                  <Label htmlFor="profile-none" className="font-normal">
                    No profile
                  </Label>
                </div>
              </RadioGroup>

              {profileType === "existing" && (
                <Input
                  placeholder="Enter GetLate profile ID"
                  value={existingProfileId}
                  onChange={(e) => setExistingProfileId(e.target.value)}
                  className="mt-2 font-mono text-sm"
                  required
                />
              )}
            </div>

            {/* Subscription Type */}
            <div className="space-y-3">
              <Label>Subscription Access</Label>
              <RadioGroup
                value={subscriptionType}
                onValueChange={(v) =>
                  setSubscriptionType(v as SubscriptionType)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="sub-active" />
                  <Label htmlFor="sub-active" className="font-normal">
                    Active (no expiration)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="trial" id="sub-trial" />
                  <Label htmlFor="sub-trial" className="font-normal">
                    7-day trial
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="sub-inactive" />
                  <Label htmlFor="sub-inactive" className="font-normal">
                    Inactive (no access)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Admin Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="create-is-admin">Admin Access</Label>
                <p className="text-xs text-muted-foreground">
                  Grant admin privileges
                </p>
              </div>
              <Switch
                id="create-is-admin"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
