import { handler } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { addDaysISO, diffDays, isISODate, workDateOf } from "@/lib/time";
import { reportsInRange } from "@/server/reports";
import { getSettings } from "@/server/settings";

export const GET = handler("export.reports", async (req) => {
  const user = await requirePermission("reports.viewAll");
  const params = new URL(req.url).searchParams;
  const { company } = await getSettings();
  const today = workDateOf(new Date(), company.timezone);
  const rawTo = params.get("to") ?? "";
  const rawFrom = params.get("from") ?? "";
  const to = isISODate(rawTo) ? rawTo : today;
  let from = isISODate(rawFrom) && rawFrom <= to ? rawFrom : to;
  if (diffDays(from, to) > 92) from = addDaysISO(to, -92);
  const rows = await reportsInRange(user, from, to, (params.get("employee") ?? "").slice(0, 40));
  const csv = toCsv(
    [
      "Date",
      "Employee ID",
      "Employee",
      "Summary",
      "Items",
      "Hours",
      "Blockers",
      "Plan for tomorrow",
      "Links",
      "Comments",
    ],
    rows.map((r) => [
      r.workDate,
      r.user.employeeCode,
      r.user.name,
      r.summary,
      r.items
        .map((i) => [i.label, i.text].filter(Boolean).join(": ") + (i.hours ? ` (${i.hours}h)` : ""))
        .join("; "),
      r.items.reduce((s, i) => s + (i.hours ?? 0), 0),
      r.blockers,
      r.tomorrowPlan,
      r.links.join(" "),
      r.comments.length,
    ]),
  );
  return csvResponse(`daily-reports_${from}_${to}.csv`, csv);
});
