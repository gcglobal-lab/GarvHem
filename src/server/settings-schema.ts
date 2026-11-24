import { z } from "zod";
import { hhmm } from "@/lib/validators/common";

const isTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\//.test(v), "Use a full https:// address")
  .default("");

export const companySchema = z.object({
  name: z.string().trim().min(1).max(80).default("GARVHEM"),
  email: z.union([z.literal(""), z.email()]).default("hello@garvhem.com"),
  careersEmail: z.union([z.literal(""), z.email()]).default("careers@garvhem.com"),
  phone: z.string().trim().max(40).default(""),
  address: z.string().trim().max(300).default("India"),
  hours: z.string().trim().max(120).default("Mon to Fri, with US and Canada overlap"),
  linkedin: url,
  x: url,
  instagram: url,
  facebook: url,
  timezone: z.string().refine(isTimezone, "Unknown timezone").default("Asia/Kolkata"),
});

export const attendanceSettingsSchema = z.object({
  workWeekDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day")
    .default([1, 2, 3, 4, 5]),
  shiftStart: hhmm.default("09:30"),
  shiftEnd: hhmm.default("18:30"),
  graceMinutes: z.number().int().min(0).max(240).default(15),
  halfDayThresholdMinutes: z.number().int().min(0).max(1440).default(300),
  lunchAllowanceMinutes: z.number().int().min(0).max(480).default(60),
  allowLunchSplit: z.boolean().default(true),
  allowMultipleSessions: z.boolean().default(true),
  autoCloseCutoff: hhmm.default("03:00"),
  autoCloseAt: z.enum(["SHIFT_END", "CUTOFF"]).default("SHIFT_END"),
});

export const reportSettingsSchema = z.object({
  editCutoff: hhmm.default("00:00"), // 00:00 = midnight at the end of the work date
  onPunchOut: z.enum(["required", "reminder", "off"]).default("reminder"),
});

export const teamSettingsSchema = z.object({
  managerTeamScope: z.boolean().default(true),
});

export const SETTINGS_GROUPS = {
  company: companySchema,
  attendance: attendanceSettingsSchema,
  reports: reportSettingsSchema,
  team: teamSettingsSchema,
} as const;

export type SettingsGroup = keyof typeof SETTINGS_GROUPS;
export type Settings = { [K in SettingsGroup]: z.infer<(typeof SETTINGS_GROUPS)[K]> };

export function buildSettings(rows: { key: string; value: unknown }[]): Settings {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const load = <S extends z.ZodObject>(key: string, schema: S): z.infer<S> => {
    const parsed = schema.safeParse(stored.get(key) ?? {});
    return parsed.success ? parsed.data : schema.parse({});
  };
  return {
    company: load("company", companySchema),
    attendance: load("attendance", attendanceSettingsSchema),
    reports: load("reports", reportSettingsSchema),
    team: load("team", teamSettingsSchema),
  };
}
