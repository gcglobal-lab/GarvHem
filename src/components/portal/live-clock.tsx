"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useSyncExternalStore } from "react";
import { usePortal } from "./providers";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const second = () => Math.floor(Date.now() / 1000);
/** Whole seconds, ticking. 0 on the server, so nothing mismatches while hydrating. */
export const useNowSeconds = () => useSyncExternalStore(subscribe, second, () => 0);

export function LiveClock() {
  const { timezone } = usePortal();
  const now = useNowSeconds();
  const label =
    timezone === "Asia/Kolkata" ? "IST" : now ? formatInTimeZone(now * 1000, timezone, "zzz") : "";
  return (
    <time
      className="tabular hidden min-w-32 text-right text-sm text-muted md:block"
      aria-label={`Company time ${label}`}
    >
      {now ? formatInTimeZone(now * 1000, timezone, "hh:mm:ss a") : ""}{" "}
      <span className="text-xs">{now ? label : ""}</span>
    </time>
  );
}
