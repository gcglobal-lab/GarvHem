import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionContext } from "@/lib/action";
import type { CurrentUser } from "@/lib/auth/guards";
import { db, lock } from "@/lib/db";
import { conflict, invalid, notFound } from "@/lib/errors";
import { addDaysISO, fromDbDate, isISODate, toDbDate, workDateOf, type ISODate } from "@/lib/time";
import type { z } from "zod";
import type { reportSchema } from "@/lib/validators/reports";
import { currentWorkDate } from "./attendance";
import { workCalendar } from "./calendar";
import { isWorkingDay } from "./leave-math";
import { notify } from "./notifications";
import { reportLockInstant } from "./report-math";
import { isCompanyWide, teamMembers, teamWhere } from "./scope";
import { getSettings, loadSettings } from "./settings";
import type { Settings } from "./settings-schema";

/** The label is a snapshot: later changes to a task never leak into old reports. */
type ReportItem = { taskId?: string | null; label?: string | null; text: string; hours?: number | null };

const lockAt = (workDate: ISODate, s: Settings) =>
  reportLockInstant(workDate, s.reports.editCutoff, s.company.timezone);

/** Reports stay editable until the cutoff, or while the person is still punched in for that date. */
async function isLocked(userId: string, workDate: ISODate, settings: Settings, now = new Date()) {
  if (now < lockAt(workDate, settings)) return false;
  const day = await db.attendanceDay.findUnique({
    where: { userId_workDate: { userId, workDate: toDbDate(workDate) } },
    select: { isOpen: true },
  });
  return !day?.isOpen;
}

const include = {
  user: { select: { id: true, name: true, employeeCode: true, designation: true } },
  attachments: { orderBy: { createdAt: "asc" } },
  comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
} as const satisfies Prisma.DailyReportInclude;
type ReportRow = Prisma.DailyReportGetPayload<{ include: typeof include }>;

function shapeAll(rows: ReportRow[]) {
  return rows.map((r) => ({
    id: r.id,
    user: r.user,
    workDate: fromDbDate(r.workDate),
    summary: r.summary,
    items: (r.items as unknown as ReportItem[]).map((i) => ({
      taskId: i.taskId ?? null,
      label: i.label ?? null,
      text: i.text,
      hours: i.hours ?? null,
    })),
    blockers: r.blockers,
    tomorrowPlan: r.tomorrowPlan,
    links: r.links,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    attachments: r.attachments.map((a) => ({ id: a.id, filename: a.filename, size: a.size })),
    comments: r.comments.map((c) => ({
      id: c.id,
      author: c.author?.name ?? "Unknown",
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  }));
}
export type ReportView = ReturnType<typeof shapeAll>[number];

/* ── Own report ───────────────────────────────────────────────────────────── */

export async function ownReport(user: CurrentUser) {
  const settings = await loadSettings();
  const workDate = await currentWorkDate(user);
  const [row, tasks] = await Promise.all([
    db.dailyReport.findUnique({
      where: { userId_workDate: { userId: user.id, workDate: toDbDate(workDate) } },
      include,
    }),
    db.task.findMany({
      where: {
        deletedAt: null,
        assignees: { some: { userId: user.id } },
        OR: [{ status: { not: "DONE" } }, { completedAt: { gte: toDbDate(addDaysISO(workDate, -2)) } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, number: true, title: true, status: true },
    }),
  ]);
  return {
    workDate,
    report: row ? shapeAll([row])[0]! : null,
    locked: await isLocked(user.id, workDate, settings),
    lockAt: lockAt(workDate, settings).toISOString(),
    tasks,
  };
}

export async function saveReport(input: z.output<typeof reportSchema>, ctx: ActionContext) {
  const { user } = ctx;
  const settings = await loadSettings();
  const workDate = await currentWorkDate(user);
  if (await isLocked(user.id, workDate, settings))
    throw conflict("This report is locked and can no longer be edited.");

  const key = { userId: user.id, workDate: toDbDate(workDate) };
  const existing = await db.dailyReport.findUnique({
    where: { userId_workDate: key },
    select: { items: true },
  });
  // Tasks listed in an earlier version of this report keep the label they had then.
  const labels = new Map(
    ((existing?.items ?? []) as unknown as ReportItem[]).flatMap((i) =>
      i.taskId ? [[i.taskId, i.label ?? null] as const] : [],
    ),
  );
  const ids = [...new Set(input.items.flatMap((i) => (i.taskId ? [i.taskId] : [])))].filter(
    (id) => !labels.has(id),
  );
  if (ids.length) {
    const mine = await db.task.findMany({
      where: { id: { in: ids }, deletedAt: null, assignees: { some: { userId: user.id } } },
      select: { id: true, number: true, title: true },
    });
    if (mine.length !== ids.length) throw invalid("Pick tasks that are assigned to you.");
    for (const t of mine) labels.set(t.id, `#${t.number} ${t.title}`);
  }
  const data = {
    summary: input.summary,
    items: input.items.map((i) => ({
      taskId: i.taskId ?? null,
      label: i.taskId ? (labels.get(i.taskId) ?? null) : null,
      text: i.text,
      hours: i.hours ?? null,
    })),
    blockers: input.blockers,
    tomorrowPlan: input.tomorrowPlan,
    links: input.links,
  };
  return db.$transaction(async (tx) => {
    await lock(tx, `report:${user.id}`);
    const saved = await tx.dailyReport.upsert({
      where: { userId_workDate: key },
      create: { ...key, ...data },
      update: data,
    });
    return { id: saved.id, workDate };
  });
}

export async function reportHistory(userId: string, take = 30) {
  const rows = await db.dailyReport.findMany({
    where: { userId },
    orderBy: { workDate: "desc" },
    take,
    select: {
      id: true,
      workDate: true,
      summary: true,
      blockers: true,
      _count: { select: { comments: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    workDate: fromDbDate(r.workDate),
    summary: r.summary,
    hasBlockers: r.blockers.length > 0,
    comments: r._count.comments,
  }));
}

/** The owner, or someone who may see all reports inside their scope. */
export async function visibleReports(user: CurrentUser): Promise<Prisma.DailyReportWhereInput> {
  if (!user.permissions.has("reports.viewAll")) return { userId: user.id };
  if (isCompanyWide(user)) return {};
  return { OR: [{ userId: user.id }, { user: await teamWhere(user) }] };
}

export async function getReport(user: CurrentUser, id: string): Promise<ReportView> {
  const row = await db.dailyReport.findFirst({
    where: { AND: [{ id }, await visibleReports(user)] },
    include,
  });
  if (!row) throw notFound("Report");
  return shapeAll([row])[0]!;
}

export async function assertOwnEditableReport(user: CurrentUser, id: string) {
  const row = await db.dailyReport.findFirst({ where: { id, userId: user.id } });
  if (!row) throw notFound("Report");
  if (await isLocked(user.id, fromDbDate(row.workDate), await loadSettings()))
    throw conflict("This report is locked and can no longer be edited.");
  return row;
}

/* ── Team views ───────────────────────────────────────────────────────────── */

export async function reportBoard(viewer: CurrentUser, filter: { date: string; employee: string }) {
  const settings = await getSettings();
  const today = workDateOf(new Date(), settings.company.timezone);
  const date = isISODate(filter.date) && filter.date <= today ? filter.date : today;
  const team = await teamMembers(viewer);
  // Admins may write reports but are never counted as missing.
  const expected = team.filter(
    (p) => p.role !== "ADMIN" && (!p.joiningDate || fromDbDate(p.joiningDate) <= date),
  );
  const people = filter.employee ? team.filter((p) => p.id === filter.employee) : team;
  const ids = people.map((p) => p.id);
  const [rows, leaves, cal] = await Promise.all([
    db.dailyReport.findMany({
      where: { userId: { in: ids }, workDate: toDbDate(date) },
      include,
      orderBy: { createdAt: "asc" },
    }),
    db.leaveRequest.findMany({
      where: {
        userId: { in: ids },
        status: "APPROVED",
        fromDate: { lte: toDbDate(date) },
        toDate: { gte: toDbDate(date) },
      },
      select: { userId: true },
    }),
    workCalendar(settings, date, date),
  ]);
  const onLeave = new Set(leaves.map((l) => l.userId));
  const submittedIds = new Set(rows.map((r) => r.userId));
  return {
    date,
    today,
    team,
    isWorkingDay: isWorkingDay(date, cal),
    submitted: shapeAll(rows),
    missing: expected
      .filter((p) => ids.includes(p.id) && !submittedIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, designation: p.designation, onLeave: onLeave.has(p.id) })),
  };
}

export async function missingReportsToday(viewer: CurrentUser) {
  const board = await reportBoard(viewer, { date: "", employee: "" });
  return board.isWorkingDay ? board.missing.filter((m) => !m.onLeave).length : 0;
}

export async function reportsInRange(viewer: CurrentUser, from: ISODate, to: ISODate, employee: string) {
  const rows = await db.dailyReport.findMany({
    where: {
      AND: [
        await visibleReports(viewer),
        { workDate: { gte: toDbDate(from), lte: toDbDate(to) } },
        employee ? { userId: employee } : {},
      ],
    },
    orderBy: [{ workDate: "desc" }, { user: { name: "asc" } }],
    take: 2000,
    include,
  });
  return shapeAll(rows);
}

export async function commentOnReport(input: { reportId: string; body: string }, ctx: ActionContext) {
  const report = await db.dailyReport.findFirst({
    where: { AND: [{ id: input.reportId }, await visibleReports(ctx.user)] },
    include: { comments: { select: { authorId: true } }, user: { select: { managerId: true } } },
  });
  if (!report) throw notFound("Report");
  const { team } = await getSettings();
  // Earlier commenters hear about it only while they may still open the report.
  const allowed = await db.user.findMany({
    where: {
      isActive: true,
      OR: [
        { id: report.userId },
        { role: "ADMIN" },
        { role: "MANAGER", ...(team.managerTeamScope ? { id: report.user.managerId ?? "" } : {}) },
      ],
    },
    select: { id: true },
  });
  const allowedIds = new Set(allowed.map((u) => u.id));
  await db.$transaction(async (tx) => {
    await tx.dailyReportComment.create({
      data: { reportId: report.id, authorId: ctx.user.id, body: input.body },
    });
    const listeners = [report.userId, ...report.comments.map((c) => c.authorId ?? "")].filter(
      (id) => id !== ctx.user.id && allowedIds.has(id),
    );
    await notify(
      listeners,
      {
        kind: "report.comment",
        title: `${ctx.user.name} commented on the ${fromDbDate(report.workDate)} report`,
        body: input.body.slice(0, 140),
        href: `/portal/reports/${report.id}`,
      },
      tx,
    );
  });
}
