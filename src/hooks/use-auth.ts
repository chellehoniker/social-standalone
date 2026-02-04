"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

/**
 * Hook to manage Supabase authentication state
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Memoize the client - createClient() returns singleton but useMemo ensures stable reference
  const supabase = useMemo(() => createClient(), []);

  // Initialize auth state - run once on mount
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to fetch profile:", error);
        return null;
      }
      return data;
    };

    const initAuth = async () => {
      console.log("[useAuth] initAuth starting...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("[useAuth] getSession result:", { session: !!session, userId: session?.user?.id, error: sessionError });

      if (!isMounted) return;

      if (session?.user) {
        console.log("[useAuth] fetching profile for user:", session.user.id);
        const profile = await fetchProfile(session.user.id);
        console.log("[useAuth] profile result:", profile);
        if (!isMounted) return;
        setState({
          user: session.user,
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
        });
        console.log("[useAuth] state set to authenticated");
      } else {
        console.log("[useAuth] no session, setting unauthenticated");
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

  return {
    ...state,
    signOut,
    refreshProfile,
    getlateProfileId: state.profile?.getlate_profile_id,
  };
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
