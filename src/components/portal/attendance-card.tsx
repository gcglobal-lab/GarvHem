"use client";

import { Coffee, LogIn, LogOut, UtensilsCrossed } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { formatClock, formatISODate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TodayState } from "@/server/attendance";
import type { PresenceState } from "@/server/attendance-math";
import { usePortal } from "./providers";
import { ReportPrompt } from "./report-prompt";
import { useAttendance } from "./use-attendance";

export const PRESENCE: Record<PresenceState, { label: string; tone: BadgeTone }> = {
  NOT_IN: { label: "Not punched in", tone: "neutral" },
  WORKING: { label: "Working", tone: "success" },
  ON_LUNCH: { label: "On lunch", tone: "warning" },
  OUT: { label: "Punched out", tone: "accent" },
};

export function AttendanceCard({ initial }: { initial: TodayState }) {
  const { timezone } = usePortal();
  const a = useAttendance(initial);
  const data = a.data ?? initial;
  const { state } = data;
  const isIn = state === "WORKING" || state === "ON_LUNCH";
  const allowanceMs = data.lunchAllowanceMinutes * 60_000;
  const remainingMs = allowanceMs - a.lunchMs;
  const over = remainingMs < 0;
  const presence = PRESENCE[state];
  const busy = (t: string) => a.pending && a.action === t;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden />
      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={presence.tone} data-testid="presence">
              <span
                className={cn("size-1.5 rounded-full bg-current", state === "WORKING" && "animate-pulse")}
                aria-hidden
              />
              {presence.label}
            </Badge>
            <span className="text-xs text-muted">{formatISODate(data.workDate, "EEEE, d MMM")}</span>
          </div>
          <p
            className="tabular mt-3 font-display text-5xl font-semibold tracking-tight sm:text-6xl"
            aria-label={`Worked time ${formatClock(a.workedMs)}`}
            data-testid="work-timer"
          >
            {formatClock(a.workedMs)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {data.firstIn
              ? `In at ${formatTime(data.firstIn, timezone)}`
              : "Your timer starts when you punch in."}
            {data.lastOut && state === "OUT" ? `, out at ${formatTime(data.lastOut, timezone)}` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row md:w-56 md:flex-col">
          {isIn ? (
            <Button
              size="lg"
              variant="primary"
              className="h-14 text-base sm:flex-1 md:flex-none"
              loading={busy("PUNCH_OUT")}
              disabled={a.pending}
              onClick={() => a.punch("PUNCH_OUT")}
            >
              <LogOut aria-hidden /> Punch Out
            </Button>
          ) : (
            <Button
              size="lg"
              variant="brand"
              className="h-14 text-base sm:flex-1 md:flex-none"
              loading={busy("PUNCH_IN")}
              disabled={a.pending || !data.canPunchIn}
              onClick={() => a.punch("PUNCH_IN")}
            >
              <LogIn aria-hidden /> {state === "OUT" ? "Punch In again" : "Punch In"}
            </Button>
          )}
          {state === "ON_LUNCH" ? (
            <Button
              variant="outline"
              size="lg"
              className="sm:h-14 sm:flex-1 md:h-12 md:flex-none"
              loading={busy("LUNCH_END")}
              disabled={a.pending}
              onClick={() => a.punch("LUNCH_END")}
            >
              <UtensilsCrossed aria-hidden /> End Lunch
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="sm:h-14 sm:flex-1 md:h-12 md:flex-none"
              loading={busy("LUNCH_START")}
              disabled={a.pending || !data.canStartLunch}
              onClick={() => a.punch("LUNCH_START")}
            >
              <Coffee aria-hidden /> Start Lunch
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">Lunch</span>
          <span
            className={cn("tabular", over ? "font-semibold text-danger" : "text-muted")}
            data-testid="lunch-remaining"
          >
            {over
              ? `${formatClock(-remainingMs)} over ${data.lunchAllowanceMinutes} min`
              : `${formatClock(remainingMs)} remaining of ${data.lunchAllowanceMinutes} min`}
          </span>
        </div>
        <Progress
          className="mt-2"
          label="Lunch used"
          tone={over ? "danger" : "accent"}
          value={allowanceMs ? (a.lunchMs / allowanceMs) * 100 : 0}
        />
      </div>
      <ReportPrompt
        mode={a.reportPrompt}
        pending={a.pending}
        onClose={a.closePrompt}
        onSkip={() => void a.punch("PUNCH_OUT", true)}
      />
    </Card>
  );
}
