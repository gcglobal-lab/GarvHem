import { z } from "zod";
import { CONFIGURABLE_MANAGER_PERMISSIONS } from "@/lib/auth/permissions";
import { id, isoDate, optionalIsoDate, text } from "./common";

export const managerPermissionSchema = z.object({
  permission: z.enum(CONFIGURABLE_MANAGER_PERMISSIONS),
  enabled: z.boolean(),
});
export const holidaySchema = z.object({
  id: id.optional(),
  date: isoDate,
  name: text(100, 2, "Enter a name"),
  isOptional: z.boolean().default(false),
});
export const announcementSchema = z.object({
  id: id.optional(),
  title: text(140, 3, "Enter a title"),
  body: text(4000, 3, "Write a message"),
  pinned: z.boolean().default(false),
  expiresOn: optionalIsoDate,
  notifyEveryone: z.boolean().default(false),
});
export const idSchema = z.object({ id });
