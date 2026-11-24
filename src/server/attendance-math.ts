/** Pure attendance maths. No database, no clock: everything is passed in. */
import { addDaysISO, instantAt, type ISODate } from "@/lib/time";

export type EventType = "PUNCH_IN" | "PUNCH_OUT" | "LUNCH_START" | "LUNCH_END";
export type AttEvent = { type: EventType; at: Date };
export type PresenceState = "NOT_IN" | "WORKING" | "ON_LUNCH" | "OUT";
export type DayStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "HOLIDAY" | "WEEKEND";

export const sortEvents = <E extends AttEvent>(events: readonly E[]): E[] =>
  [...events].sort((a, b) => a.at.getTime() - b.at.getTime());

export function stateOf(events: readonly AttEvent[]): PresenceState {
  const last = sortEvents(events).at(-1);
  if (!last) return "NOT_IN";
  return last.type === "PUNCH_OUT" ? "OUT" : last.type === "LUNCH_START" ? "ON_LUNCH" : "WORKING";
}

/** null when the action is allowed, otherwise the reason it is not. */
export function transitionError(
  state: PresenceState,
  action: EventType,
  opts: { allowMultipleSessions: boolean; allowLunchSplit: boolean; lunchesTaken: number },
): string | null {
  switch (action) {
    case "PUNCH_IN":
      if (state === "WORKING" || state === "ON_LUNCH") return "You are already punched in.";
      if (state === "OUT" && !opts.allowMultipleSessions) return "You have already punched out for today.";
      return null;
    case "PUNCH_OUT":
      return state === "WORKING" || state === "ON_LUNCH" ? null : "You are not punched in.";
    case "LUNCH_START":
      if (state === "ON_LUNCH") return "You are already on lunch.";
      if (state !== "WORKING") return "Punch in before starting lunch.";
      if (!opts.allowLunchSplit && opts.lunchesTaken > 0)
        return "You have already taken your lunch break today.";
      return null;
    case "LUNCH_END":
      return state === "ON_LUNCH" ? null : "You are not on lunch.";
  }
}

/** Checks a full, corrected sequence of events. */
export function sequenceError(events: readonly AttEvent[]): string | null {
  if (events.length === 0) return "Add at least a punch in.";
  for (let i = 1; i < events.length; i++)
    if (events[i]!.at.getTime() <= events[i - 1]!.at.getTime())
      return "Each time must be later than the one before it.";
  let state: PresenceState = "NOT_IN";
  for (const e of events) {
    const err = transitionError(state, e.type, {
      allowMultipleSessions: true,
      allowLunchSplit: true,
      lunchesTaken: 0,
    });
    if (err) return "The order of events is not valid (in, lunch start, lunch end, out).";
    state = e.type === "PUNCH_OUT" ? "OUT" : e.type === "LUNCH_START" ? "ON_LUNCH" : "WORKING";
  }
  const first = events[0]!.at.getTime();
  const last = events.at(-1)!.at.getTime();
  if (last - first > 36 * 3_600_000) return "A work day cannot be longer than 36 hours.";
  return null;
}

export type Durations = {
  totalMs: number;
  breakMs: number;
  netMs: number;
  lunches: number;
  firstIn: Date | null;
  lastOut: Date | null;
  state: PresenceState;
  /** start of the running work stretch / lunch, for live timers */
  runningSince: Date | null;
};

export function durations(input: readonly AttEvent[], now: Date): Durations {
  const events = sortEvents(input);
  let totalMs = 0;
  let breakMs = 0;
  let lunches = 0;
  let inAt: number | null = null;
  let lunchAt: number | null = null;
  let firstIn: Date | null = null;
  let lastOut: Date | null = null;

  for (const e of events) {
    const t = e.at.getTime();
    if (e.type === "PUNCH_IN" && inAt === null) {
      inAt = t;
      firstIn ??= e.at;
    } else if (e.type === "LUNCH_START" && inAt !== null && lunchAt === null) {
      lunchAt = t;
      lunches++;
    } else if (e.type === "LUNCH_END" && lunchAt !== null) {
      breakMs += t - lunchAt;
      lunchAt = null;
    } else if (e.type === "PUNCH_OUT" && inAt !== null) {
      if (lunchAt !== null) {
        breakMs += t - lunchAt;
        lunchAt = null;
      }
      totalMs += t - inAt;
      inAt = null;
      lastOut = e.at;
    }
  }

  const state: PresenceState =
    inAt !== null ? (lunchAt !== null ? "ON_LUNCH" : "WORKING") : firstIn ? "OUT" : "NOT_IN";
  if (inAt !== null) totalMs += Math.max(0, now.getTime() - inAt);
  if (lunchAt !== null) breakMs += Math.max(0, now.getTime() - lunchAt);
  return {
    totalMs,
    breakMs,
    netMs: Math.max(0, totalMs - breakMs),
    lunches,
    firstIn,
    lastOut,
    state,
    runningSince: lunchAt !== null ? new Date(lunchAt) : inAt !== null ? new Date(inAt) : null,
  };
}

export type ShiftRules = {
  tz: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  halfDayThresholdMinutes: number;
  lunchAllowanceMinutes: number;
};

export function shiftWindow(workDate: ISODate, rules: Pick<ShiftRules, "tz" | "shiftStart" | "shiftEnd">) {
  const start = instantAt(workDate, rules.shiftStart, rules.tz);
  const overnight = rules.shiftEnd <= rules.shiftStart;
  const end = instantAt(overnight ? addDaysISO(workDate, 1) : workDate, rules.shiftEnd, rules.tz);
  return { start, end };
}

/** The cutoff belongs to the next morning when it is not later than the shift start. */
export function autoCloseInstant(
  workDate: ISODate,
  cutoff: string,
  rules: Pick<ShiftRules, "tz" | "shiftStart" | "shiftEnd">,
) {
  const { start, end } = shiftWindow(workDate, rules);
  let at = instantAt(workDate, cutoff, rules.tz);
  if (at <= start) at = instantAt(addDaysISO(workDate, 1), cutoff, rules.tz);
  // an overnight shift must never be closed before it ends
  if (at < end) at = new Date(end.getTime() + 2 * 3_600_000);
  return at;
}

export type DayContext = {
  workDate: ISODate;
  isWorkingDay: boolean;
  halfDayLeave?: boolean;
  fullDayLeave?: boolean;
  rules: ShiftRules;
  now: Date;
};

export type DayResult = {
  firstIn: Date | null;
  lastOut: Date | null;
  totalMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  lunchOverrun: boolean;
  lunchOverrunMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyLeaveMinutes: number;
  status: DayStatus;
  isOpen: boolean;
};

const mins = (ms: number) => Math.floor(ms / 60_000);

export function computeDay(events: readonly AttEvent[], ctx: DayContext): DayResult {
  const d = durations(events, ctx.now);
  const { rules } = ctx;
  const { start, end } = shiftWindow(ctx.workDate, rules);
  const isOpen = d.state === "WORKING" || d.state === "ON_LUNCH";
  const breakMinutes = mins(d.breakMs);
  const netMinutes = mins(d.netMs);
  const overrun = Math.max(0, breakMinutes - rules.lunchAllowanceMinutes);

  const judged = ctx.isWorkingDay && !ctx.halfDayLeave && !ctx.fullDayLeave;
  const lateMs = judged && d.firstIn ? d.firstIn.getTime() - start.getTime() : 0;
  const isLate = lateMs > rules.graceMinutes * 60_000;
  const earlyMs = judged && !isOpen && d.lastOut ? end.getTime() - d.lastOut.getTime() : 0;
  const isEarlyLeave = earlyMs >= 60_000;

  let status: DayStatus;
  if (!d.firstIn) status = ctx.fullDayLeave ? "ON_LEAVE" : ctx.isWorkingDay ? "ABSENT" : "WEEKEND";
  else if (ctx.halfDayLeave) status = "HALF_DAY";
  else if (!isOpen && ctx.isWorkingDay && netMinutes < rules.halfDayThresholdMinutes) status = "HALF_DAY";
  else status = "PRESENT";

  return {
    firstIn: d.firstIn,
    lastOut: isOpen ? null : d.lastOut,
    totalMinutes: mins(d.totalMs),
    breakMinutes,
    netMinutes,
    lunchOverrun: overrun > 0,
    lunchOverrunMinutes: overrun,
    isLate,
    lateMinutes: isLate ? mins(lateMs) : 0,
    isEarlyLeave,
    earlyLeaveMinutes: isEarlyLeave ? mins(earlyMs) : 0,
    status,
    isOpen,
  };
}

/** Status for a date with no punches. null = nothing to say yet (today or the future). */
export function emptyDayStatus(o: {
  date: ISODate;
  today: ISODate;
  isWeekend: boolean;
  isHoliday: boolean;
  onLeave: boolean;
  joined: ISODate | null;
}): DayStatus | null {
  if (o.onLeave) return "ON_LEAVE";
  if (o.isHoliday) return "HOLIDAY";
  if (o.isWeekend) return "WEEKEND";
  if (o.joined && o.date < o.joined) return null;
  return o.date < o.today ? "ABSENT" : null;
}
