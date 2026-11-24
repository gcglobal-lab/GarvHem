import "server-only";
import type { AttendanceDay, AttendanceEvent } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import type { CurrentUser } from "@/lib/auth/guards";
import { db, lock, type Db, type Tx } from "@/lib/db";
import { AppError, conflict, invalid, notFound } from "@/lib/errors";
import type { RequestMeta } from "@/lib/request";
import {
  addDaysISO,
  diffDays,
  eachISODate,
  fromDbDate,
  fromLocalInput,
  isISODate,
  monthEnd,
  monthStart,
  toDbDate,
  weekdayOf,
  workDateOf,
  type ISODate,
} from "@/lib/time";
import type { TimesheetFilter } from "@/lib/validators/attendance";
import {
  autoCloseInstant,
  computeDay,
  durations,
  emptyDayStatus,
  sequenceError,
  shiftWindow,
  sortEvents,
  stateOf,
  transitionError,
  type DayStatus,
  type EventType,
  type PresenceState,
  type ShiftRules,
} from "./attendance-math";
import { workCalendar } from "./calendar";
import { isWorkingDay } from "./leave-math";
import { notify } from "./notifications";
import {
  assertInTeam,
  assertNotSelf,
  isCompanyWide,
  memberById,
  teamMembers,
  type TeamMember,
} from "./scope";
import { getSettings, loadSettings } from "./settings";
import type { Settings } from "./settings-schema";

type ShiftOwner = { shiftStart: string | null; shiftEnd: string | null };
type DayWithEvents = AttendanceDay & { events: AttendanceEvent[] };

export const rulesFor = (s: Settings, user: ShiftOwner): ShiftRules => ({
  tz: s.company.timezone,
  shiftStart: user.shiftStart ?? s.attendance.shiftStart,
  shiftEnd: user.shiftEnd ?? s.attendance.shiftEnd,
  graceMinutes: s.attendance.graceMinutes,
  halfDayThresholdMinutes: s.attendance.halfDayThresholdMinutes,
  lunchAllowanceMinutes: s.attendance.lunchAllowanceMinutes,
});

const withEvents = { events: { orderBy: { at: "asc" } } } as const;

const findOpenDay = (client: Db, userId: string) =>
  client.attendanceDay.findFirst({
    where: { userId, isOpen: true },
    orderBy: { workDate: "desc" },
    include: withEvents,
  });

const findDay = (client: Db, userId: string, date: ISODate) =>
  client.attendanceDay.findUnique({
    where: { userId_workDate: { userId, workDate: toDbDate(date) } },
    include: withEvents,
  });

/** Approved leave covering a date: whether it is a full or a half day for that date. */
async function leaveOn(client: Db, userId: string, date: ISODate) {
  const requests = await client.leaveRequest.findMany({
    where: { userId, status: "APPROVED", fromDate: { lte: toDbDate(date) }, toDate: { gte: toDbDate(date) } },
  });
  let full = false;
  let halves = 0;
  let requestId: string | null = null;
  for (const r of requests) {
    const isHalf =
      (fromDbDate(r.fromDate) === date && r.firstHalfDay) || (fromDbDate(r.toDate) === date && r.lastHalfDay);
    if (isHalf) halves++;
    else full = true;
    requestId = r.id;
  }
  full ||= halves > 1;
  return { full, half: halves > 0 && !full, requestId };
}

/** Rebuilds every derived column of a day from its events. */
export async function recomputeDay(
  tx: Tx,
  dayId: string,
  settings: Settings,
  now = new Date(),
): Promise<AttendanceDay> {
  const day = await tx.attendanceDay.findUniqueOrThrow({
    where: { id: dayId },
    include: { ...withEvents, user: { select: { shiftStart: true, shiftEnd: true } } },
  });
  const workDate = fromDbDate(day.workDate);
  const cal = await workCalendar(settings, workDate, workDate, tx);
  const leave = await leaveOn(tx, day.userId, workDate);
  const r = computeDay(day.events, {
    workDate,
    isWorkingDay: isWorkingDay(workDate, cal),
    halfDayLeave: leave.half,
    fullDayLeave: leave.full,
    rules: rulesFor(settings, day.user),
    now,
  });
  return tx.attendanceDay.update({ where: { id: dayId }, data: { ...r, leaveRequestId: leave.requestId } });
}

/* ── Punching ─────────────────────────────────────────────────────────────── */

export async function punch(
  user: Pick<CurrentUser, "id" | "shiftStart" | "shiftEnd">,
  action: EventType,
  meta: RequestMeta,
  opts: { skipReport?: boolean; now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const settings = await loadSettings();
  const { attendance, company } = settings;
  const today = workDateOf(now, company.timezone);

  return db.$transaction(async (tx) => {
    await lock(tx, `attendance:${user.id}`);

    let day: DayWithEvents | null = await findOpenDay(tx, user.id);
    if (day && now >= cutoffOf(day, settings, user)) {
      await closeDay(tx, day, settings, user);
      day = null;
    }
    // Punch-outs and breaks belong to the open day even after midnight.
    day ??= await findDay(tx, user.id, today);

    const events = day?.events ?? [];
    const d = durations(events, now);
    const error = transitionError(stateOf(events), action, {
      allowMultipleSessions: attendance.allowMultipleSessions,
      allowLunchSplit: attendance.allowLunchSplit,
      lunchesTaken: d.lunches,
    });
    if (error) throw conflict(error);

    if (action === "PUNCH_OUT" && day && settings.reports.onPunchOut !== "off") {
      const report = await tx.dailyReport.findUnique({
        where: { userId_workDate: { userId: user.id, workDate: day.workDate } },
        select: { id: true },
      });
      const required = settings.reports.onPunchOut === "required";
      if (!report && (required || !opts.skipReport))
        throw new AppError(
          "REPORT_REQUIRED",
          required
            ? "Submit your daily report before punching out."
            : "You have not submitted your daily report yet.",
        );
    }

    day ??= await tx.attendanceDay.create({
      data: { userId: user.id, workDate: toDbDate(today) },
      include: withEvents,
    });
    const dayId = day.id;
    const write = (type: EventType, at: Date) =>
      tx.attendanceEvent.create({
        data: { attendanceDayId: dayId, type, at, ip: meta.ip, userAgent: meta.userAgent, source: "USER" },
      });

    // One millisecond apart keeps the order of events unambiguous.
    if (action === "PUNCH_OUT" && d.state === "ON_LUNCH")
      await write("LUNCH_END", new Date(now.getTime() - 1));
    await write(action, now);
    return recomputeDay(tx, dayId, settings, now);
  });
}

/* ── Auto-close of forgotten punch-outs ───────────────────────────────────── */

const cutoffOf = (day: { workDate: Date }, s: Settings, user: ShiftOwner) =>
  autoCloseInstant(fromDbDate(day.workDate), s.attendance.autoCloseCutoff, rulesFor(s, user));

async function closeDay(tx: Tx, day: DayWithEvents, settings: Settings, user: ShiftOwner) {
  const events = sortEvents(day.events);
  const last = events.at(-1)?.at ?? new Date();
  const workDate = fromDbDate(day.workDate);
  const target =
    settings.attendance.autoCloseAt === "CUTOFF"
      ? cutoffOf(day, settings, user)
      : shiftWindow(workDate, rulesFor(settings, user)).end;
  const at = new Date(Math.max(target.getTime(), last.getTime() + 2));
  if (stateOf(events) === "ON_LUNCH")
    await tx.attendanceEvent.create({
      data: { attendanceDayId: day.id, type: "LUNCH_END", at: new Date(at.getTime() - 1), source: "SYSTEM" },
    });
  await tx.attendanceEvent.create({
    data: { attendanceDayId: day.id, type: "PUNCH_OUT", at, source: "SYSTEM" },
  });
  await recomputeDay(tx, day.id, settings, at);
  await tx.attendanceDay.update({ where: { id: day.id }, data: { autoClosed: true, needsReview: true } });
  await notify(
    [day.userId],
    {
      kind: "attendance.auto_closed",
      title: "Your punch-out was closed automatically",
      body: `You did not punch out on ${workDate}. The record was flagged for review.`,
      href: "/portal/attendance",
    },
    tx,
  );
}

/** Called by the cron route. Safe to run as often as you like. */
export async function autoCloseOpenDays(now = new Date()): Promise<number> {
  const settings = await loadSettings();
  const open = await db.attendanceDay.findMany({
    where: { isOpen: true },
    select: {
      id: true,
      userId: true,
      workDate: true,
      user: { select: { shiftStart: true, shiftEnd: true } },
    },
  });
  let closed = 0;
  for (const o of open) {
    if (now < cutoffOf(o, settings, o.user)) continue;
    await db.$transaction(async (tx) => {
      await lock(tx, `attendance:${o.userId}`);
      const day = await tx.attendanceDay.findUnique({ where: { id: o.id }, include: withEvents });
      if (!day?.isOpen) return;
      await closeDay(tx, day, settings, o.user);
      closed++;
    });
  }
  return closed;
}

/* ── Live state for the attendance card ───────────────────────────────────── */

export type TodayState = {
  state: PresenceState;
  workDate: ISODate;
  netMsBase: number; // worked time up to serverNow
  lunchMsBase: number; // lunch used up to serverNow
  lunchAllowanceMinutes: number;
  firstIn: string | null;
  lastOut: string | null;
  serverNow: string;
  reportSubmitted: boolean;
  reportRule: "required" | "reminder" | "off";
  canPunchIn: boolean;
  canStartLunch: boolean;
  events: { type: EventType; at: string }[];
};

/** The record the user is working on: an open day (even past midnight), otherwise today's. */
async function currentDay(userId: string, settings: Settings, user: ShiftOwner, now: Date) {
  const today = workDateOf(now, settings.company.timezone);
  let day: DayWithEvents | null = await findOpenDay(db, userId);
  if (day && now >= cutoffOf(day, settings, user)) day = null; // the job (or next punch) will close it
  day ??= await findDay(db, userId, today);
  return { day, workDate: day ? fromDbDate(day.workDate) : today };
}

/** Which work date a daily report written right now belongs to. */
export async function currentWorkDate(user: ShiftOwner & { id: string }, now = new Date()): Promise<ISODate> {
  return (await currentDay(user.id, await loadSettings(), user, now)).workDate;
}

export async function todayState(userId: string, now = new Date()): Promise<TodayState> {
  const [settings, user] = await Promise.all([
    loadSettings(),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { shiftStart: true, shiftEnd: true } }),
  ]);
  const { day, workDate } = await currentDay(userId, settings, user, now);
  const events = day?.events ?? [];
  const d = durations(events, now);
  const rule = { ...settings.attendance, lunchesTaken: d.lunches };
  const report = await db.dailyReport.findUnique({
    where: { userId_workDate: { userId, workDate: toDbDate(workDate) } },
    select: { id: true },
  });
  return {
    state: d.state,
    workDate,
    netMsBase: d.netMs,
    lunchMsBase: d.breakMs,
    lunchAllowanceMinutes: settings.attendance.lunchAllowanceMinutes,
    firstIn: d.firstIn?.toISOString() ?? null,
    lastOut: d.lastOut?.toISOString() ?? null,
    serverNow: now.toISOString(),
    reportSubmitted: report !== null,
    reportRule: settings.reports.onPunchOut,
    canPunchIn: transitionError(d.state, "PUNCH_IN", rule) === null,
    canStartLunch: transitionError(d.state, "LUNCH_START", rule) === null,
    events: events.map((e) => ({ type: e.type, at: e.at.toISOString() })),
  };
}

/* ── Timesheets ───────────────────────────────────────────────────────────── */

export type TimesheetRow = {
  key: string;
  dayId: string | null;
  userId: string;
  name: string;
  employeeCode: string;
  date: ISODate;
  status: DayStatus | null;
  firstIn: string | null;
  lastOut: string | null;
  totalMinutes: number;
  lunchMinutes: number;
  overrunMinutes: number;
  netMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  isOpen: boolean;
  autoClosed: boolean;
  needsReview: boolean;
  note: string | null;
};

const EMPTY = {
  firstIn: null,
  lastOut: null,
  totalMinutes: 0,
  lunchMinutes: 0,
  overrunMinutes: 0,
  netMinutes: 0,
  isLate: false,
  lateMinutes: 0,
  isEarlyLeave: false,
  isOpen: false,
  autoClosed: false,
  needsReview: false,
} as const;

/** One row per person per date, including derived absent / weekend / holiday / leave days. */
export async function buildRows(
  people: TeamMember[],
  from: ISODate,
  to: ISODate,
  now = new Date(),
): Promise<TimesheetRow[]> {
  if (!people.length || from > to) return [];
  const settings = await getSettings();
  const today = workDateOf(now, settings.company.timezone);
  const ids = people.map((p) => p.id);
  const range = { gte: toDbDate(from), lte: toDbDate(to) };
  const [days, leaves, cal] = await Promise.all([
    db.attendanceDay.findMany({ where: { userId: { in: ids }, workDate: range }, include: withEvents }),
    db.leaveRequest.findMany({
      where: {
        userId: { in: ids },
        status: "APPROVED",
        fromDate: { lte: range.lte },
        toDate: { gte: range.gte },
      },
    }),
    workCalendar(settings, from, to),
  ]);
  const byKey = new Map(days.map((d) => [`${d.userId}:${fromDbDate(d.workDate)}`, d]));
  const dates = eachISODate(from, to);
  const rows: TimesheetRow[] = [];

  for (const p of people) {
    const own = leaves.filter((l) => l.userId === p.id);
    for (const date of dates) {
      const day = byKey.get(`${p.id}:${date}`);
      const base = {
        key: `${p.id}:${date}`,
        userId: p.id,
        name: p.name,
        employeeCode: p.employeeCode,
        date,
        dayId: day?.id ?? null,
        note: day?.note ?? null,
      };
      if (day?.firstIn) {
        const live = day.isOpen ? durations(day.events, now) : null;
        const lunch = live ? Math.floor(live.breakMs / 60_000) : day.breakMinutes;
        rows.push({
          ...base,
          status: day.status,
          firstIn: day.firstIn.toISOString(),
          lastOut: day.lastOut?.toISOString() ?? null,
          totalMinutes: live ? Math.floor(live.totalMs / 60_000) : day.totalMinutes,
          lunchMinutes: lunch,
          overrunMinutes: live
            ? Math.max(0, lunch - settings.attendance.lunchAllowanceMinutes)
            : day.lunchOverrunMinutes,
          netMinutes: live ? Math.floor(live.netMs / 60_000) : day.netMinutes,
          isLate: day.isLate,
          lateMinutes: day.lateMinutes,
          isEarlyLeave: day.isEarlyLeave,
          isOpen: day.isOpen,
          autoClosed: day.autoClosed,
          needsReview: day.needsReview,
        });
        continue;
      }
      const isHoliday = cal.holidays.has(date);
      const isWeekend = !cal.workWeekDays.includes(weekdayOf(date));
      const onLeave = own.some((l) => {
        const f = fromDbDate(l.fromDate);
        const t = fromDbDate(l.toDate);
        // A half-day leave does not excuse the whole day.
        const half = (f === date && l.firstHalfDay) || (t === date && l.lastHalfDay);
        return f <= date && t >= date && !half;
      });
      const status = emptyDayStatus({
        date,
        today,
        isHoliday,
        isWeekend,
        onLeave: onLeave && !isHoliday && !isWeekend,
        joined: p.joiningDate ? fromDbDate(p.joiningDate) : null,
      });
      // Admins may punch, but nobody expects them to.
      rows.push({ ...base, ...EMPTY, status: p.role === "ADMIN" && status !== "ON_LEAVE" ? null : status });
    }
  }
  return rows;
}

const MAX_RANGE_DAYS = 92;

async function normaliseRange(f: { from: string; to: string }) {
  const { company } = await getSettings();
  const today = workDateOf(new Date(), company.timezone);
  let from = isISODate(f.from) ? f.from : addDaysISO(today, -6);
  let to = isISODate(f.to) ? f.to : today;
  if (from > to) [from, to] = [to, from];
  if (diffDays(from, to) > MAX_RANGE_DAYS) from = addDaysISO(to, -MAX_RANGE_DAYS);
  return { from, to, today };
}

export async function timesheet(viewer: CurrentUser, filter: TimesheetFilter) {
  const { from, to, today } = await normaliseRange(filter);
  const team = await teamMembers(viewer);
  const people = filter.employee ? team.filter((p) => p.id === filter.employee) : team;
  const all = await buildRows(people, from, to);
  const matches = (r: TimesheetRow) => {
    switch (filter.status) {
      case "":
        return true;
      case "LATE":
        return r.isLate;
      case "OVERRUN":
        return r.overrunMinutes > 0;
      case "REVIEW":
        return r.needsReview;
      default:
        return r.status === filter.status;
    }
  };
  const rows = all
    .filter((r) => r.status !== null && matches(r))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  return { rows, team, from, to, today };
}

export function summarise(rows: TimesheetRow[]) {
  const map = new Map<string, { name: string; days: number; net: number; late: number; overrun: number }>();
  for (const r of rows) {
    const s = map.get(r.userId) ?? { name: r.name, days: 0, net: 0, late: 0, overrun: 0 };
    if (r.firstIn) {
      s.days++;
      s.net += r.netMinutes;
      if (r.isLate) s.late++;
      if (r.overrunMinutes > 0) s.overrun++;
    }
    map.set(r.userId, s);
  }
  return [...map.values()].map((s) => ({
    name: s.name,
    averageHours: s.days ? Math.round((s.net / s.days / 60) * 10) / 10 : 0,
    late: s.late,
    overrun: s.overrun,
  }));
}

/* ── Live board ───────────────────────────────────────────────────────────── */

export type BoardEntry = {
  userId: string;
  name: string;
  designation: string | null;
  status: "WORKING" | "ON_LUNCH" | "NOT_IN" | "OUT" | "ON_LEAVE" | "OFF";
  firstIn: string | null;
  since: string | null;
  lastOut: string | null;
  netMinutes: number;
  lunchMinutes: number;
  isLate: boolean;
};

export async function liveBoard(viewer: CurrentUser, now = new Date()): Promise<BoardEntry[]> {
  const settings = await getSettings();
  const today = workDateOf(now, settings.company.timezone);
  const people = await teamMembers(viewer);
  const ids = people.map((p) => p.id);
  const [days, cal, leaves] = await Promise.all([
    db.attendanceDay.findMany({
      where: { userId: { in: ids }, OR: [{ workDate: toDbDate(today) }, { isOpen: true }] },
      include: withEvents,
    }),
    workCalendar(settings, today, today),
    db.leaveRequest.findMany({
      where: {
        userId: { in: ids },
        status: "APPROVED",
        fromDate: { lte: toDbDate(today) },
        toDate: { gte: toDbDate(today) },
      },
      select: { userId: true },
    }),
  ]);
  const onLeave = new Set(leaves.map((l) => l.userId));
  const off = !isWorkingDay(today, cal);

  return people.flatMap((p): BoardEntry[] => {
    const mine = days.filter((d) => d.userId === p.id && (!d.isOpen || now < cutoffOf(d, settings, p)));
    const day = mine.find((d) => d.isOpen) ?? mine.find((d) => fromDbDate(d.workDate) === today);
    const d = durations(day?.events ?? [], now);
    if (p.role === "ADMIN" && d.state === "NOT_IN") return []; // not expected to punch
    const idle = off ? "OFF" : onLeave.has(p.id) ? "ON_LEAVE" : "NOT_IN";
    return [
      {
        userId: p.id,
        name: p.name,
        designation: p.designation,
        status: d.state === "NOT_IN" ? idle : d.state,
        firstIn: d.firstIn?.toISOString() ?? null,
        since: d.runningSince?.toISOString() ?? null,
        lastOut: d.lastOut?.toISOString() ?? null,
        netMinutes: Math.floor(d.netMs / 60_000),
        lunchMinutes: Math.floor(d.breakMs / 60_000),
        isLate: day?.isLate ?? false,
      },
    ];
  });
}

/* ── Day detail and correction ────────────────────────────────────────────── */

export async function dayDetail(viewer: CurrentUser, userId: string, date: ISODate) {
  const person = viewer.id === userId ? viewer : await assertInTeam(viewer, userId);
  const day = await findDay(db, userId, date);
  const corrections =
    day && viewer.permissions.has("team.attendance.view")
      ? await db.auditLog.findMany({
          where: { action: "attendance.correct", targetType: "AttendanceDay", targetId: day.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { actor: { select: { name: true } } },
        })
      : [];
  return {
    person: { id: person.id, name: person.name, employeeCode: person.employeeCode },
    day,
    corrections: corrections.map((c) => ({
      id: c.id,
      by: c.actor?.name ?? "System",
      at: c.createdAt.toISOString(),
      reason: (c.after as { reason?: string } | null)?.reason ?? "",
    })),
  };
}

export async function correctDay(
  input: { userId: string; workDate: ISODate; events: { type: EventType; at: string }[]; reason: string },
  ctx: ActionContext,
) {
  const target = await assertInTeam(ctx.user, input.userId);
  assertNotSelf(ctx.user, input.userId);
  const settings = await loadSettings();
  const tz = settings.company.timezone;
  const now = new Date();
  const events = input.events.map((e) => ({ type: e.type, at: fromLocalInput(e.at, tz) }));
  const error = sequenceError(events);
  if (error) throw invalid(error);
  if (events.some((e) => e.at > now)) throw invalid("Times cannot be in the future.");
  if (workDateOf(events[0]!.at, tz) !== input.workDate)
    throw invalid("The first punch in must be on the work date.");
  const open = events.at(-1)!.type !== "PUNCH_OUT";
  if (open && now >= cutoffOf({ workDate: toDbDate(input.workDate) }, settings, target))
    throw invalid("Add a punch out: this day is already over.");

  return db.$transaction(async (tx) => {
    await lock(tx, `attendance:${input.userId}`);
    if (open) {
      const other = await findOpenDay(tx, input.userId);
      if (other && fromDbDate(other.workDate) !== input.workDate)
        throw conflict(`${target.name} still has an open record on ${fromDbDate(other.workDate)}.`);
    }
    const existing = await findDay(tx, input.userId, input.workDate);
    const day =
      existing ??
      (await tx.attendanceDay.create({ data: { userId: input.userId, workDate: toDbDate(input.workDate) } }));
    await tx.attendanceEvent.deleteMany({ where: { attendanceDayId: day.id } });
    await tx.attendanceEvent.createMany({
      data: events.map((e) => ({
        ...e,
        attendanceDayId: day.id,
        source: "ADMIN_CORRECTION" as const,
        ip: ctx.meta.ip,
        userAgent: ctx.meta.userAgent,
      })),
    });
    const updated = await recomputeDay(tx, day.id, settings, now);
    await tx.attendanceDay.update({
      where: { id: day.id },
      data: { needsReview: false, autoClosed: false, note: `Corrected: ${input.reason}`.slice(0, 300) },
    });
    const before = existing && {
      firstIn: existing.firstIn,
      lastOut: existing.lastOut,
      netMinutes: existing.netMinutes,
      breakMinutes: existing.breakMinutes,
      status: existing.status,
      autoClosed: existing.autoClosed,
      events: existing.events.map((e) => ({ type: e.type, at: e.at, source: e.source, ip: e.ip })),
    };
    await audit(
      {
        action: "attendance.correct",
        actorId: ctx.user.id,
        targetType: "AttendanceDay",
        targetId: day.id,
        before,
        after: {
          reason: input.reason,
          employee: target.name,
          workDate: input.workDate,
          events,
          netMinutes: updated.netMinutes,
          status: updated.status,
        },
        meta: ctx.meta,
      },
      tx,
    );
    await notify(
      [input.userId],
      {
        kind: "attendance.corrected",
        title: `Your attendance for ${input.workDate} was corrected`,
        body: `By ${ctx.user.name}: ${input.reason}`,
        href: "/portal/attendance",
      },
      tx,
    );
    return { id: day.id };
  });
}

export async function markReviewed(dayId: string, ctx: ActionContext) {
  const day = await db.attendanceDay.findUnique({ where: { id: dayId } });
  if (!day) throw notFound();
  await assertInTeam(ctx.user, day.userId);
  assertNotSelf(ctx.user, day.userId);
  await db.attendanceDay.update({ where: { id: dayId }, data: { needsReview: false } });
  await audit({
    action: "attendance.reviewed",
    actorId: ctx.user.id,
    targetType: "AttendanceDay",
    targetId: dayId,
    meta: ctx.meta,
  });
}

export const canEditAttendance = (viewer: CurrentUser, targetId: string) =>
  viewer.permissions.has("team.attendance.edit") && (viewer.id !== targetId || isCompanyWide(viewer));

/* ── Own history, weekly chart, monthly matrix ────────────────────────────── */

const monthAnchor = async (month: string) => {
  const { company } = await getSettings();
  const today = workDateOf(new Date(), company.timezone);
  return { today, anchor: /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `${month}-01` : today };
};

export async function userMonth(userId: string, month: string) {
  const { today, anchor } = await monthAnchor(month);
  const rows = await buildRows([await memberById(userId)], monthStart(anchor), monthEnd(anchor));
  const count = (s: DayStatus) => rows.filter((r) => r.status === s).length;
  const worked = rows.filter((r) => r.firstIn);
  const netMinutes = worked.reduce((s, r) => s + r.netMinutes, 0);
  return {
    month: anchor.slice(0, 7),
    today,
    rows,
    totals: {
      present: count("PRESENT"),
      halfDay: count("HALF_DAY"),
      absent: count("ABSENT"),
      onLeave: count("ON_LEAVE"),
      netMinutes,
      averageMinutes: worked.length ? Math.round(netMinutes / worked.length) : 0,
      late: rows.filter((r) => r.isLate).length,
      overrunMinutes: rows.reduce((s, r) => s + r.overrunMinutes, 0),
    },
  };
}

export async function dailyHours(userId: string, from: ISODate, to: ISODate, now = new Date()) {
  const days = await db.attendanceDay.findMany({
    where: { userId, workDate: { gte: toDbDate(from), lte: toDbDate(to) } },
    include: withEvents,
  });
  const map = new Map(
    days.map((d) => [
      fromDbDate(d.workDate),
      d.isOpen ? durations(d.events, now).netMs / 60_000 : d.netMinutes,
    ]),
  );
  return eachISODate(from, to).map((date) => ({ date, minutes: Math.floor(map.get(date) ?? 0) }));
}

export async function monthMatrix(viewer: CurrentUser, month: string) {
  const { today, anchor } = await monthAnchor(month);
  const from = monthStart(anchor);
  const to = monthEnd(anchor);
  const people = await teamMembers(viewer);
  const rows = await buildRows(people, from, to);
  return {
    month: anchor.slice(0, 7),
    today,
    dates: eachISODate(from, to),
    people: people.map((p) => ({ id: p.id, name: p.name, rows: rows.filter((r) => r.userId === p.id) })),
  };
}
