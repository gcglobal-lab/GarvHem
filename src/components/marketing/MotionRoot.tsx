"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Loads the animation code once the page has settled. Everything is visible and usable without it. */
export function MotionRoot() {
  const pathname = usePathname();

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    const load = () =>
      void import("./motion-runtime").then((m) => {
        if (!cancelled) stop = m.startMotion();
      });
    const idle = () =>
      "requestIdleCallback" in window
        ? window.requestIdleCallback(load, { timeout: 800 })
        : setTimeout(load, 200);
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", idle);
      stop?.();
    };
  }, [pathname]);

  return null;
}
