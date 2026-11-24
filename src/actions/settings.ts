"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import {
  announcementSchema,
  holidaySchema,
  idSchema,
  managerPermissionSchema,
} from "@/lib/validators/settings";
import {
  deleteAnnouncement,
  deleteHoliday,
  saveAnnouncement,
  saveHoliday,
  setManagerPermission,
} from "@/server/company";
import { updateSettings } from "@/server/settings";
import {
  attendanceSettingsSchema,
  companySchema,
  reportSettingsSchema,
  teamSettingsSchema,
} from "@/server/settings-schema";

const refresh = () => revalidatePath("/", "layout");
const permission = "settings.manage" as const;

export const saveCompanyAction = createAction(
  { name: "settings.company", permission, schema: companySchema },
  async (input, ctx) => {
    await updateSettings("company", input, ctx);
    refresh();
  },
);
export const saveAttendanceSettingsAction = createAction(
  { name: "settings.attendance", permission, schema: attendanceSettingsSchema },
  async (input, ctx) => {
    await updateSettings("attendance", input, ctx);
    refresh();
  },
);
export const saveReportSettingsAction = createAction(
  { name: "settings.reports", permission, schema: reportSettingsSchema },
  async (input, ctx) => {
    await updateSettings("reports", input, ctx);
    refresh();
  },
);
export const saveTeamSettingsAction = createAction(
  { name: "settings.team", permission, schema: teamSettingsSchema },
  async (input, ctx) => {
    await updateSettings("team", input, ctx);
    refresh();
  },
);
export const setManagerPermissionAction = createAction(
  { name: "settings.permission", permission, schema: managerPermissionSchema },
  async (input, ctx) => {
    await setManagerPermission(input, ctx);
    refresh();
  },
);
export const saveHolidayAction = createAction(
  { name: "settings.holiday", permission, schema: holidaySchema },
  async (input, ctx) => {
    await saveHoliday(input, ctx);
    refresh();
  },
);
export const deleteHolidayAction = createAction(
  { name: "settings.holiday.delete", permission, schema: idSchema },
  async (input, ctx) => {
    await deleteHoliday(input.id, ctx);
    refresh();
  },
);
export const saveAnnouncementAction = createAction(
  { name: "settings.announcement", limit: { max: 30, seconds: 600 }, permission, schema: announcementSchema },
  async (input, ctx) => {
    await saveAnnouncement(input, ctx);
    refresh();
  },
);
export const deleteAnnouncementAction = createAction(
  { name: "settings.announcement.delete", permission, schema: idSchema },
  async (input, ctx) => {
    await deleteAnnouncement(input.id, ctx);
    refresh();
  },
);
