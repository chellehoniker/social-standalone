"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, Check } from "lucide-react";

interface AccessibleProfile {
  id: string;
  name: string;
  isOwner: boolean;
}

interface ProfilesResponse {
  profiles: AccessibleProfile[];
}

/**
 * ProfileSwitcher - Dropdown menu item for switching between accessible profiles (pen names)
 *
 * Only renders if the user has access to multiple profiles.
 * Must be used inside a DropdownMenuContent.
 */
export function ProfileSwitcher() {
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const profiles = data?.profiles || [];

  // Don't render if loading or user has only one profile
  if (isLoading || profiles.length <= 1) {
    return null;
  }

  // Determine current selection - use selectedProfileId or fall back to owner profile
  const ownerProfile = profiles.find((p) => p.isOwner);
  const currentProfileId = selectedProfileId || ownerProfile?.id || profiles[0]?.id;

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);

    // Invalidate queries that depend on the selected profile
    // This forces a refetch of posts, accounts, etc.
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["queue"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-sm">
          <Users className="mr-2 h-3 w-3" />
          Switch Profile
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-48">
          <DropdownMenuRadioGroup
            value={currentProfileId}
            onValueChange={handleProfileChange}
          >
            {profiles.map((profile) => (
              <DropdownMenuRadioItem
                key={profile.id}
                value={profile.id}
                className="text-sm"
              >
                <span className="truncate">
                  {profile.name}
                  {profile.isOwner && (
                    <span className="ml-1 text-muted-foreground">(Primary)</span>
                  )}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
    </>
  );
}
