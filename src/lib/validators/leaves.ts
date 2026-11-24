import { z } from "zod";
import { halfDays, id, isoDate, reason, text } from "./common";

export const applyLeaveSchema = z
  .object({
    leaveTypeId: id,
    from: isoDate,
    to: isoDate,
    firstHalfDay: z.boolean().default(false),
    lastHalfDay: z.boolean().default(false),
    reason: text(1000, 3, "Give a short reason"),
  })
  .refine((v) => v.from <= v.to, {
    path: ["to"],
    message: "The end date must be on or after the start date",
  });

export const cancelLeaveSchema = z.object({ id });

export const decideLeaveSchema = z
  .object({ id, decision: z.enum(["APPROVED", "REJECTED"]), note: text(500).default("") })
  .refine((v) => v.decision === "APPROVED" || v.note.length >= 3, {
    path: ["note"],
    message: "Tell the employee why the request was rejected",
  });

export const adjustBalanceSchema = z.object({
  userId: id,
  leaveTypeId: id,
  year: z.number().int().min(2020).max(2100),
  delta: halfDays.refine((n) => n !== 0 && Math.abs(n) <= 365, "Enter between 0.5 and 365 days"),
  reason,
});

export const bulkAllocateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  carryForward: z.boolean().default(true),
});

export const leaveTypeSchema = z.object({
  id: id.optional(),
  name: text(60, 2, "Enter a name"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
  isPaid: z.boolean(),
  isUnlimited: z.boolean(),
  yearlyQuota: halfDays.refine((n) => n >= 0 && n <= 365, "Between 0 and 365 days"),
  carryForward: z.boolean(),
  maxCarryForward: halfDays.refine((n) => n >= 0 && n <= 365, "Between 0 and 365 days"),
  isActive: z.boolean(),
});
