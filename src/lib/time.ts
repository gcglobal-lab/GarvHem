/**
 * Time rules: instants are UTC `Date`s. A "work date" is a calendar date string
 * ("YYYY-MM-DD") in the company timezone, stored as a Postgres DATE.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "Asia/Kolkata";
export type ISODate = string; // YYYY-MM-DD

/** A real calendar date between 2000 and 2100 ("2026-06-31" is not one). */
export function isISODate(v: string): boolean {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export const workDateOf = (instant: Date, tz: string): ISODate => formatInTimeZone(instant, tz, "yyyy-MM-dd");
export const toDbDate = (iso: ISODate): Date => new Date(`${iso}T00:00:00.000Z`);
export const fromDbDate = (d: Date): ISODate => d.toISOString().slice(0, 10);

/** The UTC instant of a wall-clock time ("HH:mm") on a work date. */
export const instantAt = (iso: ISODate, hhmm: string, tz: string): Date =>
  fromZonedTime(`${iso}T${hhmm}:00`, tz);

export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = toDbDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDbDate(d);
}

export const weekdayOf = (iso: ISODate): number => toDbDate(iso).getUTCDay(); // 0 = Sunday
export const yearOf = (iso: ISODate): number => Number(iso.slice(0, 4));
export const diffDays = (from: ISODate, to: ISODate): number =>
  Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / 86_400_000);

export function eachISODate(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push(d);
  return out;
}

export const monthStart = (iso: ISODate): ISODate => `${iso.slice(0, 7)}-01`;
export function monthEnd(iso: ISODate): ISODate {
  const [y, m] = iso.split("-").map(Number) as [number, number];
  return fromDbDate(new Date(Date.UTC(y, m, 0)));
}
/** Monday of the week containing the date. */
export const weekStart = (iso: ISODate): ISODate => addDaysISO(iso, -((weekdayOf(iso) + 6) % 7));

export const formatTime = (d: Date | string | null | undefined, tz: string): string =>
  d ? formatInTimeZone(new Date(d), tz, "hh:mm a") : "-";
export const formatDateTime = (d: Date | string | null | undefined, tz: string): string =>
  d ? formatInTimeZone(new Date(d), tz, "d MMM yyyy, hh:mm a") : "-";
/** For <input type="datetime-local"> */
export const toLocalInput = (d: Date | string, tz: string): string =>
  formatInTimeZone(new Date(d), tz, "yyyy-MM-dd'T'HH:mm");
export const fromLocalInput = (value: string, tz: string): Date => fromZonedTime(`${value}:00`, tz);

export const formatISODate = (iso: ISODate | null | undefined, pattern = "d MMM yyyy"): string =>
  iso ? formatInTimeZone(toDbDate(iso), "UTC", pattern) : "-";

export function formatMinutes(min: number): string {
  const sign = min < 0 ? "-" : "";
  const m = Math.abs(Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${sign}${r}m`;
  return r === 0 ? `${sign}${h}h` : `${sign}${h}h ${r}m`;
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export function timeAgo(d: Date | string, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return formatInTimeZone(new Date(d), DEFAULT_TZ, "d MMM yyyy");
}
