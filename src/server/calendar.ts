import "server-only";
import { db, type Db } from "@/lib/db";
import { fromDbDate, toDbDate, type ISODate } from "@/lib/time";
import type { WorkCalendar } from "./leave-math";
import type { Settings } from "./settings-schema";

export async function workCalendar(
  settings: Settings,
  from: ISODate,
  to: ISODate,
  client: Db = db,
): Promise<WorkCalendar> {
  const rows = await client.holiday.findMany({
    where: { date: { gte: toDbDate(from), lte: toDbDate(to) }, isOptional: false },
    select: { date: true },
  });
  return {
    workWeekDays: settings.attendance.workWeekDays,
    holidays: new Set(rows.map((r) => fromDbDate(r.date))),
  };
}
