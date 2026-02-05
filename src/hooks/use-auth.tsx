"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
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
 * Uses onAuthStateChange as the primary auth mechanism to avoid
 * issues with getSession() and navigator.locks in development.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
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
        return data as Profile;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        console.error("[AuthProvider] Profile fetch error:", err);
        return null;
      }
    };

    const handleAuthChange = async (session: Session | null) => {
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
    };

    // Subscribe to auth changes - this will fire INITIAL_SESSION immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthProvider] onAuthStateChange:", event);
        await handleAuthChange(session);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .single();

      if (!error && data) {
        setState((prev) => ({ ...prev, profile: data as Profile }));
      }
    }
  }, [state.user]);

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
