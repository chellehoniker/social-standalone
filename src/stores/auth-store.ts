import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Auth Hydration Store
 *
 * Minimal store for hydration tracking only.
 * All actual auth state is managed by Supabase via useAuth hook.
 * This store prevents flash on client-side navigation by ensuring
 * components wait for Zustand to hydrate before rendering.
 */
interface AuthHydrationState {
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthHydrationState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: "aa-social-hydration",
      partialize: () => ({}), // Don't persist anything
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export type { AuthHydrationState };
