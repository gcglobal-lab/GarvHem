"use client";

import { useEffect, useRef, useState } from "react";

/** Eases a displayed number towards its target. Instant with reduced motion. */
export function useTween(target: number, ms = 450): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = instant ? 1 : Math.min(1, (now - t0) / ms);
      const v = p === 1 ? target : from + (target - from) * (1 - (1 - p) ** 3);
      current.current = v;
      setShown(v);
      if (p < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return shown;
}
