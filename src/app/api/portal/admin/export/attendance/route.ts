import { handler } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatTime } from "@/lib/time";
import { timesheetFilterSchema } from "@/lib/validators/attendance";
import { timesheet } from "@/server/attendance";
import { getSettings } from "@/server/settings";

export const GET = handler("export.attendance", async (req) => {
  const user = await requirePermission("team.attendance.view");
  const filter = timesheetFilterSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { rows, from, to } = await timesheet(user, filter);
  const { company } = await getSettings();
  const time = (v: string | null) => (v ? formatTime(v, company.timezone) : "");
  const csv = toCsv(
    [
      "Date",
      "Employee ID",
      "Employee",
      "Status",
      "Punch in",
      "Punch out",
      "Lunch (min)",
      "Lunch overrun (min)",
      "Total (min)",
      "Net (min)",
      "Net hours",
      "Late",
      "Late (min)",
      "Early leave",
      "Auto closed",
      "Needs review",
      "Note",
    ],
    rows.map((r) => [
      r.date,
      r.employeeCode,
      r.name,
      r.status,
      time(r.firstIn),
      time(r.lastOut),
      r.lunchMinutes,
      r.overrunMinutes,
      r.totalMinutes,
      r.netMinutes,
      Math.round((r.netMinutes / 60) * 100) / 100,
      r.isLate ? "Yes" : "No",
      r.lateMinutes,
      r.isEarlyLeave ? "Yes" : "No",
      r.autoClosed ? "Yes" : "No",
      r.needsReview ? "Yes" : "No",
      r.note,
    ]),
  );
  return csvResponse(`attendance_${from}_${to}.csv`, csv);
});
