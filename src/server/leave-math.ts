/** Pure leave maths: working days, half days, year splits and ledger balances. */
import { eachISODate, weekdayOf, yearOf, type ISODate } from "@/lib/time";

export type WorkCalendar = { workWeekDays: readonly number[]; holidays: ReadonlySet<ISODate> };

export const isWorkingDay = (date: ISODate, cal: WorkCalendar): boolean =>
  cal.workWeekDays.includes(weekdayOf(date)) && !cal.holidays.has(date);

export type LeaveSpan = { from: ISODate; to: ISODate; firstHalfDay: boolean; lastHalfDay: boolean };
export type LeaveDay = { date: ISODate; portion: 1 | 0.5 };

/** Working days inside the span, with half days applied only when that end falls on a working day. */
export function leaveDays(span: LeaveSpan, cal: WorkCalendar): LeaveDay[] {
  return eachISODate(span.from, span.to)
    .filter((d) => isWorkingDay(d, cal))
    .map((date) => {
      const half = (date === span.from && span.firstHalfDay) || (date === span.to && span.lastHalfDay);
      return { date, portion: half ? 0.5 : 1 };
    });
}

export const totalDays = (days: readonly LeaveDay[]): number => days.reduce((s, d) => s + d.portion, 0);

export function daysByYear(days: readonly LeaveDay[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of days) map.set(yearOf(d.date), (map.get(yearOf(d.date)) ?? 0) + d.portion);
  return map;
}

export const spansOverlap = (a: { from: ISODate; to: ISODate }, b: { from: ISODate; to: ISODate }): boolean =>
  a.from <= b.to && b.from <= a.to;

/** Multi-day requests may share one date when one ends at midday and the other starts then. */
export function spansClash(a: LeaveSpan, b: LeaveSpan): boolean {
  if (!spansOverlap(a, b)) return false;
  const [x, y] = a.from <= b.from ? [a, b] : [b, a];
  if (x.to === y.from && x.from !== x.to && y.from !== y.to) return !(x.lastHalfDay && y.firstHalfDay);
  return true;
}

export type LedgerRow = { delta: number; kind: string };
export type Balance = { allotted: number; used: number; pending: number; remaining: number };

/**
 * allotted  = everything credited (allocation, accrual, carry-forward, adjustments)
 * used      = deductions net of reversals
 * remaining = ledger sum minus requests still waiting for a decision
 */
export function balanceFrom(ledger: readonly LedgerRow[], pendingDays: number): Balance {
  let allotted = 0;
  let used = 0;
  for (const e of ledger) {
    if (e.kind === "DEDUCTION" || e.kind === "REVERSAL") used -= e.delta;
    else allotted += e.delta;
  }
  return { allotted, used: used + 0, pending: pendingDays, remaining: allotted - used - pendingDays };
}

/** Days that may move into the next year. */
export function carryForwardDays(
  closingBalance: number,
  type: { carryForward: boolean; maxCarryForward: number },
): number {
  if (!type.carryForward || closingBalance <= 0) return 0;
  return Math.min(closingBalance, type.maxCarryForward);
}
