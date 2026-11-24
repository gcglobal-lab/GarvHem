import { addDaysISO, instantAt, type ISODate } from "@/lib/time";

/** Last instant a report may be edited. A cutoff before noon belongs to the next calendar day. */
export function reportLockInstant(workDate: ISODate, cutoff: string, tz: string): Date {
  return instantAt(cutoff < "12:00" ? addDaysISO(workDate, 1) : workDate, cutoff, tz);
}
