import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UsageStats {
  planName: string;
  limits: {
    uploads: number;
    profiles: number;
  };
  usage: {
    uploads: number;
    profiles: number;
  };
}

interface AuthState {
  apiKey: string | null;
  usageStats: UsageStats | null;
  isValidating: boolean;
  error: string | null;
  setApiKey: (key: string | null) => void;
  setUsageStats: (stats: UsageStats | null) => void;
  setIsValidating: (validating: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      usageStats: null,
      isValidating: false,
      error: null,
      setApiKey: (key) => set({ apiKey: key, error: null }),
      setUsageStats: (stats) => set({ usageStats: stats }),
      setIsValidating: (validating) => set({ isValidating: validating }),
      setError: (error) => set({ error }),
      logout: () =>
        set({
          apiKey: null,
          usageStats: null,
          error: null,
        }),
    }),
    {
      name: "latewiz-auth",
      partialize: (state) => ({
        apiKey: state.apiKey,
        usageStats: state.usageStats,
      }),
    }
  )
);
