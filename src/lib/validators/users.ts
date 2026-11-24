import { z } from "zod";
import { email, halfDays, id, optionalHhmm, optionalIsoDate, optionalText, phone, text } from "./common";

export const ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;

const base = {
  name: text(100, 2, "Enter the full name"),
  email,
  phone,
  role: z.enum(ROLES),
  designation: optionalText(100),
  department: optionalText(100),
  managerId: z
    .union([z.literal(""), id])
    .nullish()
    .transform((v) => v || null),
  joiningDate: optionalIsoDate,
  shiftStart: optionalHhmm,
  shiftEnd: optionalHhmm,
};

const shiftPair = (v: { shiftStart: string | null; shiftEnd: string | null }) =>
  (v.shiftStart === null) === (v.shiftEnd === null);
const shiftMessage = { path: ["shiftEnd"], message: "Set both shift times, or leave both empty" };

export const createUserSchema = z
  .object({
    ...base,
    employeeCode: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z0-9-]{3,20}$/, "Use letters, numbers and dashes"),
      ])
      .nullish()
      .transform((v) => v || null),
    allocations: z
      .array(z.object({ leaveTypeId: id, days: halfDays.refine((n) => n >= 0 && n <= 365) }))
      .max(30)
      .default([]),
  })
  .refine(shiftPair, shiftMessage);

export const updateUserSchema = z.object({ id, ...base }).refine(shiftPair, shiftMessage);
export const userIdSchema = z.object({ id });
export const setActiveSchema = z.object({ id, isActive: z.boolean() });
export const updateOwnProfileSchema = z.object({ phone });

export const userFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  role: z.enum(["", ...ROLES]).catch(""),
  status: z.enum(["", "active", "inactive"]).catch(""),
  department: z.string().max(100).catch(""),
});
export type UserFilter = z.infer<typeof userFilterSchema>;
