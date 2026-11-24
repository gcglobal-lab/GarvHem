"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { punchAction } from "@/actions/attendance";
import { useAction } from "@/components/ui/use-action";
import { api } from "@/lib/client-api";
import type { TodayState } from "@/server/attendance";
import type { EventType } from "@/server/attendance-math";
import { useNowSeconds } from "./live-clock";

type Cached = TodayState & { receivedAt: number };
export const stampAttendance = (s: TodayState): Cached => ({ ...s, receivedAt: Date.now() });
export const ATTENDANCE_KEY = ["attendance-today"];

const DONE: Record<EventType, string> = {
  PUNCH_IN: "Punched in. Have a good day!",
  PUNCH_OUT: "Punched out. See you tomorrow!",
  LUNCH_START: "Lunch started.",
  LUNCH_END: "Welcome back from lunch.",
};

/** Today's record with live timers. The server's clock is the base; the browser only counts seconds. */
export function useAttendance(initial?: TodayState) {
  const client = useQueryClient();
  const router = useRouter();
  const now = useNowSeconds() * 1000;
  const [reportPrompt, setReportPrompt] = useState<"required" | "reminder" | null>(null);

  const { data } = useQuery({
    queryKey: ATTENDANCE_KEY,
    queryFn: async () => stampAttendance(await api<TodayState>("/api/portal/attendance/today")),
    initialData: initial ? () => stampAttendance(initial) : undefined,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

  const [action, setAction] = useState<EventType | null>(null);
  const { run, pending } = useAction(punchAction, {
    onSuccess: (state) => {
      client.setQueryData(ATTENDANCE_KEY, stampAttendance(state));
      setReportPrompt(null);
      router.refresh();
    },
    onError: (failure) => {
      if (failure.code === "REPORT_REQUIRED") {
        setReportPrompt(data?.reportRule === "required" ? "required" : "reminder");
        return true;
      }
      void client.invalidateQueries({ queryKey: ATTENDANCE_KEY });
      return false;
    },
    success: (state) => DONE[state.events.at(-1)?.type ?? "PUNCH_IN"],
  });

  const punch = (type: EventType, skipReport = false) => {
    setAction(type);
    return run({ action: type, skipReport });
  };

  const drift = data && now ? Math.max(0, now - data.receivedAt) : 0;
  const working = data?.state === "WORKING";
  const onLunch = data?.state === "ON_LUNCH";
  return {
    data,
    pending,
    action,
    punch,
    reportPrompt,
    closePrompt: () => setReportPrompt(null),
    workedMs: (data?.netMsBase ?? 0) + (working ? drift : 0),
    lunchMs: (data?.lunchMsBase ?? 0) + (onLunch ? drift : 0),
  };
}
