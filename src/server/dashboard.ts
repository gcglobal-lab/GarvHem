import "server-only";
import type { CurrentUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { addDaysISO, formatISODate, fromDbDate, toDbDate, weekStart, workDateOf } from "@/lib/time";
import { buildRows, liveBoard } from "./attendance";
import { newLeadCount } from "./leads";
import { missingReportsToday } from "./reports";
import { teamMembers, teamWhere } from "./scope";
import { getSettings } from "./settings";
import { STATUS_LABEL, visibleTasks } from "./tasks";

export async function adminOverview(viewer: CurrentUser) {
  const { company } = await getSettings();
  const tz = company.timezone;
  const today = workDateOf(new Date(), tz);
  const from = addDaysISO(today, -29);
  const [board, people, scope, taskScope] = await Promise.all([
    liveBoard(viewer),
    teamMembers(viewer),
    teamWhere(viewer),
    visibleTasks(viewer),
  ]);
  const [rows, pendingLeaves, missingReports, overdueTasks, statusGroups] = await Promise.all([
    buildRows(people, from, today),
    db.leaveRequest.count({ where: { status: "PENDING", user: scope } }),
    missingReportsToday(viewer),
    db.task.count({
      where: { AND: [taskScope, { status: { not: "DONE" }, dueDate: { lt: toDbDate(today) } }] },
    }),
    db.task.groupBy({ by: ["status"], where: taskScope, _count: true }),
  ]);
  const n = (s: string) => board.filter((b) => b.status === s).length;
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  return {
    today,
    kpis: {
      present: n("WORKING") + n("ON_LUNCH") + n("OUT"),
      onLunch: n("ON_LUNCH"),
      absent: n("NOT_IN"),
      onLeave: n("ON_LEAVE"),
      headcount: people.length,
      pendingLeaves,
      missingReports,
      overdueTasks,
    },
    attendanceTrend: dates
      .map((date) => {
        const day = rows.filter((r) => r.date === date);
        return {
          date,
          label: formatISODate(date, "d MMM"),
          present: day.filter((r) => r.firstIn).length,
          absent: day.filter((r) => r.status === "ABSENT").length,
          onLeave: day.filter((r) => r.status === "ON_LEAVE").length,
        };
      })
      // days off would draw misleading zeros
      .filter((d) => d.present + d.absent + d.onLeave > 0),
    hoursByEmployee: people
      .map((p) => ({
        name: p.name,
        hours:
          Math.round(rows.filter((r) => r.userId === p.id).reduce((s, r) => s + r.netMinutes, 0) / 6) / 10,
      }))
      .filter((p) => p.hours > 0 || people.some((x) => x.name === p.name && x.role !== "ADMIN"))
      .sort((a, b) => b.hours - a.hours),
    taskStatus: (["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((s) => ({
      status: s,
      label: STATUS_LABEL[s],
      count: statusGroups.find((g) => g.status === s)?._count ?? 0,
    })),
  };
}

export async function leadsByWeek(weeks = 10) {
  const { company } = await getSettings();
  const tz = company.timezone;
  const start = addDaysISO(weekStart(workDateOf(new Date(), tz)), -7 * (weeks - 1));
  const leads = await db.lead.findMany({
    where: { createdAt: { gte: toDbDate(addDaysISO(start, -1)) } },
    select: { createdAt: true },
  });
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDaysISO(start, i * 7);
    return {
      week,
      label: formatISODate(week, "d MMM"),
      leads: leads.filter((l) => weekStart(workDateOf(l.createdAt, tz)) === week).length,
    };
  });
}

/** Recent activity across the parts of the system the viewer may see. */
export async function activityFeed(viewer: CurrentUser, take = 10) {
  const [taskScope, scope] = await Promise.all([visibleTasks(viewer), teamWhere(viewer)]);
  const canAudit = viewer.permissions.has("audit.view");
  const [tasks, leaves, reports, leads] = await Promise.all([
    db.taskActivity.findMany({
      where: { task: taskScope },
      orderBy: { createdAt: "desc" },
      take,
      include: { actor: { select: { name: true } }, task: { select: { id: true, title: true } } },
    }),
    db.leaveRequest.findMany({
      where: { user: scope },
      orderBy: { updatedAt: "desc" },
      take,
      include: { user: { select: { name: true } }, leaveType: { select: { name: true } } },
    }),
    db.dailyReport.findMany({
      where: { user: scope },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { name: true } } },
    }),
    viewer.permissions.has("leads.view") || canAudit
      ? db.lead.findMany({ orderBy: { createdAt: "desc" }, take })
      : Promise.resolve([]),
  ]);
  return [
    ...tasks.map((t) => ({
      id: `t${t.id}`,
      kind: "task" as const,
      who: t.actor?.name ?? "System",
      text: `${t.message} (${t.task.title})`,
      href: `/portal/tasks/${t.task.id}`,
      at: t.createdAt.toISOString(),
    })),
    ...leaves.map((l) => ({
      id: `l${l.id}`,
      kind: "leave" as const,
      who: l.user.name,
      text: `${l.leaveType.name} leave ${l.status.toLowerCase()}`,
      href: "/portal/admin/leaves",
      at: l.updatedAt.toISOString(),
    })),
    ...reports.map((r) => ({
      id: `r${r.id}`,
      kind: "report" as const,
      who: r.user.name,
      text: `submitted the report for ${formatISODate(fromDbDate(r.workDate), "d MMM")}`,
      href: `/portal/reports/${r.id}`,
      at: r.createdAt.toISOString(),
    })),
    ...leads.map((l) => ({
      id: `d${l.id}`,
      kind: "lead" as const,
      who: l.fullName,
      text: `sent an enquiry from ${l.country}`,
      href: `/portal/admin/leads/${l.id}`,
      at: l.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, take);
}

/** Counters shown in the sidebar. */
export async function sidebarCounts(user: CurrentUser) {
  const [leads, leaves] = await Promise.all([
    user.permissions.has("leads.view") ? newLeadCount() : 0,
    user.permissions.has("leaves.approve")
      ? db.leaveRequest.count({ where: { status: "PENDING", user: await teamWhere(user) } })
      : 0,
  ]);
  return { leads, leaves };
}
