"use client";

import { useEffect, useState, useCallback } from "react";
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

  const supabase = createClient();

  // Fetch profile data
  const fetchProfile = useCallback(async (userId: string) => {
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
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
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

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
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
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

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
      const profile = await fetchProfile(state.user.id);
      setState((prev) => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

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
