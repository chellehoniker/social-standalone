"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Server-provided auth state - passed from Server Components to Client Components
 * This is the source of truth for auth in protected routes (dashboard, etc.)
 */
interface ServerAuthState {
  userId: string;
  userEmail: string;
  subscriptionStatus: string | null;
  getlateProfileId: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  isAuthenticated: true; // Always true since this is only used in protected routes
}

const ServerAuthContext = createContext<ServerAuthState | null>(null);

interface ServerAuthProviderProps {
  children: ReactNode;
  userId: string;
  userEmail: string;
  subscriptionStatus: string | null;
  getlateProfileId: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
}

/**
 * ServerAuthProvider - Provides server-verified auth state to client components
 *
 * Use this in protected routes where the server has already verified auth.
 * Child components can use useServerAuth() to access auth data without
 * needing to re-verify with Supabase client.
 */
export function ServerAuthProvider({
  children,
  userId,
  userEmail,
  subscriptionStatus,
  getlateProfileId,
  priceId,
  currentPeriodEnd,
}: ServerAuthProviderProps) {
  const value: ServerAuthState = {
    userId,
    userEmail,
    subscriptionStatus,
    getlateProfileId,
    priceId,
    currentPeriodEnd,
    isAuthenticated: true,
  };

  return (
    <ServerAuthContext.Provider value={value}>
      {children}
    </ServerAuthContext.Provider>
  );
}

/**
 * Hook to access server-provided auth state
 *
 * Only works within ServerAuthProvider (protected routes).
 * Returns null if not in a protected route.
 */
export function useServerAuth(): ServerAuthState | null {
  return useContext(ServerAuthContext);
}

/**
 * Hook that requires server auth - throws if not in protected route
 */
export function useRequireServerAuth(): ServerAuthState {
  const context = useContext(ServerAuthContext);

  if (!context) {
    throw new Error(
      "useRequireServerAuth must be used within a ServerAuthProvider (protected route)"
    );
  }

  return context;
}
