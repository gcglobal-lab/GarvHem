import { z } from "zod";
import { id, isoDate, localDateTime, reason } from "./common";

const eventType = z.enum(["PUNCH_IN", "PUNCH_OUT", "LUNCH_START", "LUNCH_END"]);

export const punchSchema = z.object({ action: eventType, skipReport: z.boolean().default(false) });

export const correctionSchema = z.object({
  userId: id,
  workDate: isoDate,
  events: z
    .array(z.object({ type: eventType, at: localDateTime }))
    .min(1, "Add at least a punch in")
    .max(40),
  reason,
});

export const markReviewedSchema = z.object({ dayId: id });

export const TIMESHEET_STATUSES = [
  "",
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKEND",
  "LATE",
  "OVERRUN",
  "REVIEW",
] as const;

export const timesheetFilterSchema = z.object({
  employee: z.string().max(40).catch(""),
  from: z.string().max(10).catch(""),
  to: z.string().max(10).catch(""),
  status: z.enum(TIMESHEET_STATUSES).catch(""),
});
export type TimesheetFilter = z.infer<typeof timesheetFilterSchema>;
