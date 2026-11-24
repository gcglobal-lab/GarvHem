import { z } from "zod";
import { BUDGETS, COUNTRIES, HEARD_FROM, LEAD_SERVICES, LEAD_STATUSES } from "./lead-options";
import { email, id, optionalIsoDate, optionalText, phone, text } from "./common";

export * from "./lead-options";

const emptyTo = <T extends z.ZodType>(schema: T) => z.union([z.literal(""), schema]).nullish();

/** Shared by the browser form and the API route. */
export const leadSchema = z.object({
  fullName: text(120, 2, "Enter your full name"),
  email,
  company: optionalText(160),
  country: z.enum(COUNTRIES, "Choose a country"),
  phone,
  services: z.array(z.enum(LEAD_SERVICES)).min(1, "Choose at least one service").max(LEAD_SERVICES.length),
  rolesNeeded: optionalText(300),
  headcount: emptyTo(z.coerce.number().int("Enter a whole number").min(1).max(500)).transform((v) =>
    v === "" || v === undefined ? null : v,
  ),
  budgetRange: emptyTo(z.enum(BUDGETS)).transform((v) => v || null),
  startDate: optionalIsoDate,
  requirement: text(5000, 20, "Tell us a little more (at least 20 characters)"),
  heardFrom: emptyTo(z.enum(HEARD_FROM)).transform((v) => v || null),
  consent: z.literal(true, "Please accept so we can contact you"),
  sourcePage: z
    .string()
    .max(200)
    .regex(/^\/[\w\-/]*$/)
    .catch("/contact"),
});
export type LeadInput = z.input<typeof leadSchema>;
export type LeadData = z.output<typeof leadSchema>;

export const moveLeadSchema = z.object({ id, status: z.enum(LEAD_STATUSES) });
export const updateLeadSchema = z.object({
  id,
  ownerId: z
    .union([z.literal(""), id])
    .nullish()
    .transform((v) => v || null),
  followUpDate: optionalIsoDate,
});
export const leadNoteSchema = z.object({ leadId: id, body: text(4000, 1, "Write a note") });

export const leadFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["", ...LEAD_STATUSES]).catch(""),
  country: z.enum(["", ...COUNTRIES]).catch(""),
  service: z.enum(["", ...LEAD_SERVICES]).catch(""),
  owner: z.string().max(40).catch(""),
});
export type LeadFilter = z.infer<typeof leadFilterSchema>;
