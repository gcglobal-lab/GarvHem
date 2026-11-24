"use client";

import { useCallback, useRef } from "react";

/** Dialogs opened without a Radix trigger: remembers the opener and gives focus back on close. */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  const remember = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  const restore = useCallback(() => {
    const el = opener.current;
    // After the dialog has unmounted and released its focus trap.
    window.setTimeout(() => {
      if (el?.isConnected && document.activeElement === document.body) el.focus({ preventScroll: true });
    }, 40);
  }, []);
  return { remember, restore };
}
