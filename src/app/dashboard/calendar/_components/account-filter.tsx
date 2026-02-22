"use client";

import { useAccounts } from "@/hooks";
import { useTheme } from "next-themes";
import { getAccountColor } from "@/lib/account-colors";
import { AccountAvatar } from "@/components/accounts";
import { cn } from "@/lib/utils";

interface AccountFilterProps {
  filterAccountIds: string[];
  onFilterChange: (ids: string[]) => void;
}

export function AccountFilter({
  filterAccountIds,
  onFilterChange,
}: AccountFilterProps) {
  const { data: accountsData } = useAccounts();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const accounts = (accountsData?.accounts || []) as any[];

  if (accounts.length <= 1) return null;

  const isAllSelected = filterAccountIds.length === 0;

  const toggleAccount = (accountId: string) => {
    if (filterAccountIds.includes(accountId)) {
      const next = filterAccountIds.filter((id) => id !== accountId);
      onFilterChange(next);
    } else {
      onFilterChange([...filterAccountIds, accountId]);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onFilterChange([])}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          isAllSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent"
        )}
      >
        All
      </button>
      {accounts.map((account: any) => {
        const color = getAccountColor(account._id, isDark);
        const isActive = filterAccountIds.includes(account._id);
        return (
          <button
            key={account._id}
            onClick={() => toggleAccount(account._id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-transparent text-white"
                : "border-border bg-background text-foreground hover:bg-accent"
            )}
            style={
              isActive
                ? { backgroundColor: color }
                : undefined
            }
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <AccountAvatar account={account} size="xs" />
            <span className="max-w-24 truncate">
              {account.displayName || account.username}
            </span>
          </button>
        );
      })}
    </div>
  );
}
