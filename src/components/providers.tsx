"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores";

function HydrationGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [mounted, setMounted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fallback timeout - don't leave users on blank page forever
    const timer = setTimeout(() => setTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Wait for mount and (hydration OR timeout) to prevent flash
  if (!mounted || (!hasHydrated && !timedOut)) {
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <HydrationGate>{children}</HydrationGate>
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
