import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  // User preferences
  timezone: string;

  // Legacy: Profile ID selection (deprecated in multi-tenant mode)
  // Each user now has exactly one profile, managed by Supabase
  defaultProfileId: string | null;

  // UI state
  sidebarOpen: boolean;

  // Actions
  setTimezone: (timezone: string) => void;
  /** @deprecated Profile is now determined by Supabase user */
  setDefaultProfileId: (profileId: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      defaultProfileId: null,
      sidebarOpen: true,

      setTimezone: (timezone) => set({ timezone }),
      setDefaultProfileId: (profileId) => set({ defaultProfileId: profileId }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: "aa-social-app",
      partialize: (state) => ({
        timezone: state.timezone,
        // Don't persist defaultProfileId - it's determined by Supabase
      }),
    }
  )
);
