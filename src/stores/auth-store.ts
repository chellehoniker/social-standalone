import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Auth store for app-wide authentication state.
 * Note: Most auth state is now managed by useAuth hook with Supabase.
 * This store is kept for backwards compatibility and hydration tracking.
 */
interface AuthState {
  // Hydration state - needed to prevent flash on client-side navigation
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  // Legacy compatibility - these are now managed by useAuth hook
  // Kept for components that may still reference them
  isValidating: boolean;
  error: string | null;
  setIsValidating: (validating: boolean) => void;
  setError: (error: string | null) => void;

  // Clear all auth state (used on sign out)
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      isValidating: false,
      error: null,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setIsValidating: (validating) => set({ isValidating: validating }),
      setError: (error) => set({ error }),

      logout: () =>
        set({
          error: null,
          isValidating: false,
        }),
    }),
    {
      name: "aa-social-auth",
      partialize: () => ({}), // Don't persist anything - Supabase handles sessions
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Re-export for backwards compatibility
// New code should use useAuth from hooks
export type { AuthState };
