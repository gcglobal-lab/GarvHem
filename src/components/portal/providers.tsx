"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/menu";
import { refreshSession } from "@/lib/client-api";

export type PortalContextValue = {
  userId: string;
  name: string;
  email: string;
  roleLabel: string;
  permissions: string[];
  timezone: string;
};
const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const value = useContext(PortalContext);
  if (!value) throw new Error("usePortal must be used inside the portal");
  return value;
}

const REFRESH_EVERY_MS = 10 * 60_000;

/** Renews the 15-minute access token in the background while the tab is in use. */
function useSessionKeeper() {
  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < REFRESH_EVERY_MS) return;
      last = Date.now();
      void refreshSession();
    };
    const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
}

const readTheme = () => (/(?:^|;\s*)gv_theme=dark/.test(document.cookie) ? "dark" : "light");

/** Dark mode applies inside the portal only, so the class is removed on the way out. */
function useThemeClass() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", readTheme() === "dark");
    return () => root.classList.remove("dark");
  }, []);
}

export function setTheme(theme: "light" | "dark") {
  document.cookie = `gv_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function PortalProviders({ value, children }: { value: PortalContextValue; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
      }),
  );
  useSessionKeeper();
  useThemeClass();
  return (
    <PortalContext.Provider value={value}>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
      </QueryClientProvider>
    </PortalContext.Provider>
  );
}
