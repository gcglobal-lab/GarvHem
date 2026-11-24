import { z } from "zod";
import { isISODate } from "@/lib/time";

// zod probes for eval() to compile schemas; the Content-Security-Policy forbids it, so skip the probe.
z.config({ jitless: true });

export const id = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");
export const isoDate = z.string().refine(isISODate, "Enter a valid date");
export const optionalIsoDate = z
  .union([z.literal(""), isoDate])
  .nullish()
  .transform((v) => v || null);
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");
export const optionalHhmm = z
  .union([z.literal(""), hhmm])
  .nullish()
  .transform((v) => v || null);
export const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid date and time");
export const email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email("Enter a valid email address"))
  .transform((v) => v.toLowerCase());
export const text = (max: number, min = 0, message?: string) =>
  z
    .string()
    .trim()
    .min(min, message ?? (min > 1 ? `Enter at least ${min} characters` : "This field is required"))
    .max(max, `Keep it under ${max} characters`);
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .nullish()
    .transform((v) => v || null);
export const phone = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,24}$/, "Enter a valid phone number"),
  ])
  .nullish()
  .transform((v) => v || null);
export const halfDays = z
  .number()
  .refine((n) => Number.isFinite(n) && Math.round(n * 2) === n * 2, "Use whole or half days");
export const page = z.coerce.number().int().min(1).max(10_000).catch(1);
export const reason = text(500, 5, "Give a reason (at least 5 characters)");
