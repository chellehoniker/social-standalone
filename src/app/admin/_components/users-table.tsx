"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Shield } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import type { Profile } from "@/lib/supabase/types";
import { UserDetailSheet } from "./user-detail-sheet";
import { DeleteUserDialog } from "./delete-user-dialog";

interface UsersTableProps {
  users: Profile[];
  isLoading?: boolean;
  onUserUpdated?: () => void;
  onUserDeleted?: () => void;
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600">Active</Badge>;
    case "past_due":
      return <Badge variant="destructive">Past Due</Badge>;
    case "canceled":
      return <Badge variant="secondary">Canceled</Badge>;
    default:
      return <Badge variant="outline">Inactive</Badge>;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UsersTable({
  users,
  isLoading,
  onUserUpdated,
  onUserDeleted,
}: UsersTableProps) {
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-muted p-3 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-background" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-background" />
              <div className="h-3 w-24 rounded bg-background" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg bg-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-lg bg-muted p-3 cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => setEditingUser(user)}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img
                src={getAvatarUrl(user.email, "bottts")}
                alt={user.email}
                className={`h-10 w-10 rounded-full ${
                  user.is_admin ? "ring-2 ring-destructive" : ""
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  {user.is_admin && (
                    <Shield className="h-3 w-3 text-destructive shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(user.subscription_status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingUser(user)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeletingUser(user)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Sheet */}
      <UserDetailSheet
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSuccess={() => {
          setEditingUser(null);
          onUserUpdated?.();
        }}
      />

      {/* Delete Dialog */}
      <DeleteUserDialog
        user={deletingUser}
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onSuccess={() => {
          setDeletingUser(null);
          onUserDeleted?.();
        }}
      />
    </>
  );
}
