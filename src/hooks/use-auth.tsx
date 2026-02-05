"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getlateProfileId: string | null | undefined;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider - Single source of truth for auth state
 *
 * This provider initializes auth ONCE at the app level.
 * All components using useAuth() share the same state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Singleton Supabase client
  const supabase = useMemo(() => createClient(), []);

  // Initialize auth state - runs ONCE at app level
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (userId: string) => {
      if (!isMounted) return null;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("[AuthProvider] Failed to fetch profile:", error);
          return null;
        }
        return data;
      } catch (err) {
        // Ignore AbortError - just means component unmounted
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        throw err;
      }
    };

    const initAuth = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        const session = data?.session;

        if (sessionError) {
          console.error("[AuthProvider] getSession error:", sessionError);
        }

        if (!isMounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!isMounted) return;
          setState({
            user: session.user,
            session,
            profile,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (err) {
        // Ignore AbortError - expected when component unmounts during fetch
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("[AuthProvider] initAuth error:", err);
        if (isMounted) {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initAuth();

    // Single subscription for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        try {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (!isMounted) return;
            setState({
              user: session.user,
              session,
              profile,
              isLoading: false,
              isAuthenticated: true,
            });
          } else {
            setState({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } catch (err) {
          // Ignore AbortError
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          console.error("[AuthProvider] onAuthStateChange error:", err);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Sign out function
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [supabase]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .single();

      if (!error && data) {
        setState((prev) => ({ ...prev, profile: data }));
      }
    }
  }, [state.user, supabase]);

  const value: AuthContextValue = {
    ...state,
    signOut,
    refreshProfile,
    getlateProfileId: state.profile?.getlate_profile_id,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from the AuthContext
 *
 * All components using this hook share the same auth state.
 * Auth is initialized once by AuthProvider, not per-component.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * Hook to check if user has active subscription
 */
export function useSubscriptionStatus() {
  const { profile, isLoading } = useAuth();

  return {
    isActive: profile?.subscription_status === "active",
    status: profile?.subscription_status,
    nextBillingDate: profile?.current_period_end,
    priceId: profile?.price_id,
    isLoading,
  };
}
