"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface AccessibleProfile {
  id: string;
  name: string;
  isOwner: boolean;
}

interface ProfilesResponse {
  profiles: AccessibleProfile[];
}

/**
 * Standalone profile switcher using a Select dropdown.
 * Can be placed anywhere on a page (unlike ProfileSwitcher which must be inside a DropdownMenu).
 * Only renders if the user has access to multiple profiles.
 */
export function StandaloneProfileSwitcher() {
  const queryClient = useQueryClient();
  const { selectedProfileId, setSelectedProfileId } = useAppStore();

  const { data, isLoading } = useQuery<ProfilesResponse>({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const response = await fetch("/api/late/profiles/all", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const profiles = data?.profiles || [];

  if (isLoading || profiles.length <= 1) {
    return null;
  }

  const ownerProfile = profiles.find((p) => p.isOwner);
  const currentProfileId =
    selectedProfileId || ownerProfile?.id || profiles[0]?.id;

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["queue"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <Select value={currentProfileId} onValueChange={handleProfileChange}>
      <SelectTrigger size="sm" className="gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Select profile" />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            {profile.name}
            {profile.isOwner && (
              <span className="ml-1 text-muted-foreground">(Primary)</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
