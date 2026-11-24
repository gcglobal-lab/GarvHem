import "server-only";
import type { LeaveRequest, LeaveType, Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import type { CurrentUser } from "@/lib/auth/guards";
import { db, lock, type Db, type Tx } from "@/lib/db";
import { conflict, invalid, notFound } from "@/lib/errors";
import {
  addDaysISO,
  formatISODate,
  fromDbDate,
  toDbDate,
  workDateOf,
  yearOf,
  type ISODate,
} from "@/lib/time";
import type { z } from "zod";
import type { adjustBalanceSchema, applyLeaveSchema, leaveTypeSchema } from "@/lib/validators/leaves";
import { recomputeDay } from "./attendance";
import { workCalendar } from "./calendar";
import {
  balanceFrom,
  carryForwardDays,
  daysByYear,
  leaveDays,
  spansClash,
  totalDays,
  type Balance,
  type LeaveSpan,
} from "./leave-math";
import { approversFor, notifyWithEmail } from "./notifications";
import { assertInTeam, assertNotSelf, teamWhere } from "./scope";
import { getSettings, loadSettings } from "./settings";
import type { Settings } from "./settings-schema";

const toSpan = (r: LeaveRequest): LeaveSpan => ({
  from: fromDbDate(r.fromDate),
  to: fromDbDate(r.toDate),
  firstHalfDay: r.firstHalfDay,
  lastHalfDay: r.lastHalfDay,
});

const spanLabel = (s: LeaveSpan) =>
  s.from === s.to ? formatISODate(s.from) : `${formatISODate(s.from)} to ${formatISODate(s.to)}`;

async function daysOf(span: LeaveSpan, settings: Settings, client: Db) {
  return leaveDays(span, await workCalendar(settings, span.from, span.to, client));
}

/* ── Balances ─────────────────────────────────────────────────────────────── */

export type TypeBalance = Balance & {
  typeId: string;
  name: string;
  color: string;
  isPaid: boolean;
  isUnlimited: boolean;
};

/** Ledger balances per leave type. Nothing is ever stored as a bare number. */
export async function balancesFor(
  userIds: string[],
  year: number,
  client: Db = db,
): Promise<Map<string, TypeBalance[]>> {
  const [types, ledger, pending, settings] = await Promise.all([
    client.leaveType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    client.leaveLedgerEntry.findMany({ where: { userId: { in: userIds }, year } }),
    client.leaveRequest.findMany({
      where: {
        userId: { in: userIds },
        status: "PENDING",
        fromDate: { lte: toDbDate(`${year}-12-31`) },
        toDate: { gte: toDbDate(`${year}-01-01`) },
      },
    }),
    loadSettings(client),
  ]);
  const pendingDays = new Map<string, number>();
  for (const r of pending) {
    const inYear = daysByYear(await daysOf(toSpan(r), settings, client)).get(year) ?? 0;
    const key = `${r.userId}:${r.leaveTypeId}`;
    pendingDays.set(key, (pendingDays.get(key) ?? 0) + inYear);
  }
  return new Map(
    userIds.map((userId) => [
      userId,
      types.map((t) => ({
        typeId: t.id,
        name: t.name,
        color: t.color,
        isPaid: t.isPaid,
        isUnlimited: t.isUnlimited,
        ...balanceFrom(
          ledger
            .filter((e) => e.userId === userId && e.leaveTypeId === t.id)
            .map((e) => ({ delta: Number(e.delta), kind: e.kind })),
          pendingDays.get(`${userId}:${t.id}`) ?? 0,
        ),
      })),
    ]),
  );
}

export const userBalances = async (userId: string, year: number, client: Db = db) =>
  (await balancesFor([userId], year, client)).get(userId) ?? [];

export async function currentYear() {
  const { company } = await getSettings();
  return yearOf(workDateOf(new Date(), company.timezone));
}

/* ── Apply / cancel ───────────────────────────────────────────────────────── */

const BACKDATE_LIMIT_DAYS = 30;
const FUTURE_LIMIT_DAYS = 366;

async function assertEnoughBalance(
  tx: Tx,
  userId: string,
  type: LeaveType,
  perYear: Map<number, number>,
  excludePendingDays = new Map<number, number>(),
) {
  if (type.isUnlimited) return;
  for (const [year, needed] of perYear) {
    const balance = (await userBalances(userId, year, tx)).find((b) => b.typeId === type.id);
    const available = (balance?.remaining ?? 0) + (excludePendingDays.get(year) ?? 0);
    if (needed > available)
      throw invalid(
        `Not enough ${type.name} leave for ${year}: ${Math.max(0, available)} available, ${needed} requested.`,
        { leaveTypeId: "Balance is too low" },
      );
  }
}

export async function previewLeave(span: LeaveSpan) {
  const settings = await getSettings();
  if (span.from > span.to) return 0;
  return totalDays(await daysOf(span, settings, db));
}

export async function applyLeave(user: CurrentUser, input: z.output<typeof applyLeaveSchema>) {
  const settings = await loadSettings();
  const today = workDateOf(new Date(), settings.company.timezone);
  if (input.from < addDaysISO(today, -BACKDATE_LIMIT_DAYS))
    throw invalid(`Leave can be backdated by at most ${BACKDATE_LIMIT_DAYS} days.`, {
      from: "Too far in the past",
    });
  if (input.to > addDaysISO(today, FUTURE_LIMIT_DAYS))
    throw invalid("Leave can be requested up to one year ahead.", { to: "Too far in the future" });

  const span: LeaveSpan = {
    from: input.from,
    to: input.to,
    firstHalfDay: input.firstHalfDay,
    lastHalfDay: input.from === input.to ? false : input.lastHalfDay,
  };

  const request = await db.$transaction(async (tx) => {
    await lock(tx, `leave:${user.id}`);
    const type = await tx.leaveType.findFirst({ where: { id: input.leaveTypeId, isActive: true } });
    if (!type) throw notFound("Leave type");

    const days = await daysOf(span, settings, tx);
    const total = totalDays(days);
    if (total === 0)
      throw invalid("Those dates are all weekends or holidays.", { from: "No working days selected" });

    const existing = await tx.leaveRequest.findMany({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
        fromDate: { lte: toDbDate(span.to) },
        toDate: { gte: toDbDate(span.from) },
      },
    });
    const clash = existing.find((r) => spansClash(toSpan(r), span));
    if (clash)
      throw conflict(`This overlaps your ${clash.status.toLowerCase()} leave (${spanLabel(toSpan(clash))}).`);

    await assertEnoughBalance(tx, user.id, type, daysByYear(days));
    return tx.leaveRequest.create({
      data: {
        userId: user.id,
        leaveTypeId: type.id,
        fromDate: toDbDate(span.from),
        toDate: toDbDate(span.to),
        firstHalfDay: span.firstHalfDay,
        lastHalfDay: span.lastHalfDay,
        days: total,
        reason: input.reason,
      },
      include: { leaveType: true },
    });
  });

  await notifyWithEmail(await approversFor(user), {
    kind: "leave.applied",
    title: `${user.name} requested ${request.leaveType.name} leave`,
    body: `${spanLabel(span)} (${Number(request.days)} day${Number(request.days) === 1 ? "" : "s"}): ${input.reason}`,
    href: "/portal/admin/leaves",
  });
  return { id: request.id, days: Number(request.days) };
}

export async function cancelLeave(requestId: string, ctx: ActionContext) {
  const { user } = ctx;
  const settings = await loadSettings();
  const today = workDateOf(new Date(), settings.company.timezone);

  const cancelled = await db.$transaction(async (tx) => {
    await lock(tx, `leave:${user.id}`);
    // Ownership is part of the lookup, so other people's ids simply do not exist here.
    const r = await tx.leaveRequest.findFirst({
      where: { id: requestId, userId: user.id },
      include: { leaveType: true },
    });
    if (!r) throw notFound("Leave request");
    const wasApproved = r.status === "APPROVED";
    if (r.status !== "PENDING" && !wasApproved) throw conflict("This request can no longer be cancelled.");
    if (wasApproved && fromDbDate(r.fromDate) <= today)
      throw conflict(
        "Only approved leave that has not started can be cancelled. Please contact your administrator.",
      );

    await tx.leaveRequest.update({
      where: { id: r.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (wasApproved) {
      await lock(tx, `attendance:${user.id}`); // the same lock punches take
      const deductions = await tx.leaveLedgerEntry.findMany({
        where: { relatedRequestId: r.id, kind: "DEDUCTION" },
      });
      await tx.leaveLedgerEntry.createMany({
        data: deductions.map((d) => ({
          userId: d.userId,
          leaveTypeId: d.leaveTypeId,
          year: d.year,
          delta: -Number(d.delta),
          kind: "REVERSAL" as const,
          reason: "Approved leave cancelled by the employee",
          actorId: user.id,
          relatedRequestId: r.id,
        })),
      });
      await clearLeaveAttendance(tx, r.id, settings);
    }
    await audit(
      {
        action: "leave.cancel",
        actorId: user.id,
        targetType: "LeaveRequest",
        targetId: r.id,
        before: { status: r.status },
        after: { status: "CANCELLED" },
        meta: ctx.meta,
      },
      tx,
    );
    return r;
  });

  await notifyWithEmail(await approversFor(user), {
    kind: "leave.cancelled",
    title: `${user.name} cancelled ${cancelled.leaveType.name} leave`,
    body: spanLabel(toSpan(cancelled)),
    href: "/portal/admin/leaves",
  });
}

/* ── Decide ───────────────────────────────────────────────────────────────── */

export async function decideLeave(
  input: { id: string; decision: "APPROVED" | "REJECTED"; note: string },
  ctx: ActionContext,
) {
  const found = await db.leaveRequest.findUnique({ where: { id: input.id }, select: { userId: true } });
  if (!found) throw notFound("Leave request");
  if (found.userId !== ctx.user.id) await assertInTeam(ctx.user, found.userId);
  assertNotSelf(ctx.user, found.userId);
  const settings = await loadSettings();

  const request = await db.$transaction(async (tx) => {
    await lock(tx, `leave:${found.userId}`);
    const r = await tx.leaveRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: { leaveType: true },
    });
    if (r.status !== "PENDING") throw conflict(`This request is already ${r.status.toLowerCase()}.`);

    const days = await daysOf(toSpan(r), settings, tx);
    const total = totalDays(days);
    if (input.decision === "APPROVED") {
      const perYear = daysByYear(days);
      // The request itself is still counted as pending, so give those days back before comparing.
      await assertEnoughBalance(tx, r.userId, r.leaveType, perYear, perYear);
      await tx.leaveLedgerEntry.createMany({
        data: [...perYear].map(([year, n]) => ({
          userId: r.userId,
          leaveTypeId: r.leaveTypeId,
          year,
          delta: -n,
          kind: "DEDUCTION" as const,
          reason: `Leave ${spanLabel(toSpan(r))}`,
          actorId: ctx.user.id,
          relatedRequestId: r.id,
        })),
      });
    }
    const updated = await tx.leaveRequest.update({
      where: { id: r.id },
      data: {
        status: input.decision,
        approverId: ctx.user.id,
        decisionNote: input.note || null,
        decidedAt: new Date(),
        days: total, // holidays may have changed since the request was made
      },
      include: { leaveType: true },
    });
    if (input.decision === "APPROVED") {
      await lock(tx, `attendance:${r.userId}`); // the same lock punches take
      for (const d of days) {
        const key = { userId: r.userId, workDate: toDbDate(d.date) };
        const day = await tx.attendanceDay.findUnique({
          where: { userId_workDate: key },
          include: { events: true },
        });
        if (day?.events.length) await recomputeDay(tx, day.id, settings);
        else if (d.portion === 1)
          await tx.attendanceDay.upsert({
            where: { userId_workDate: key },
            create: { ...key, status: "ON_LEAVE", leaveRequestId: r.id },
            update: { status: "ON_LEAVE", leaveRequestId: r.id },
          });
      }
    }
    await audit(
      {
        action: input.decision === "APPROVED" ? "leave.approve" : "leave.reject",
        actorId: ctx.user.id,
        targetType: "LeaveRequest",
        targetId: r.id,
        before: { status: r.status },
        after: { status: input.decision, note: input.note, days: total },
        meta: ctx.meta,
      },
      tx,
    );
    return updated;
  });

  await notifyWithEmail([request.userId], {
    kind: `leave.${input.decision.toLowerCase()}`,
    title: `Your ${request.leaveType.name} leave was ${input.decision.toLowerCase()}`,
    body: `${spanLabel(toSpan(request))}${input.note ? `: ${input.note}` : ""}`,
    href: "/portal/leaves",
  });
}

/** Undo what an approval wrote into attendance. */
async function clearLeaveAttendance(tx: Tx, requestId: string, settings: Settings) {
  const days = await tx.attendanceDay.findMany({
    where: { leaveRequestId: requestId },
    include: { events: true },
  });
  for (const d of days) {
    if (d.events.length) await recomputeDay(tx, d.id, settings);
    else await tx.attendanceDay.delete({ where: { id: d.id } });
  }
}

/* ── Adjustments and allocation ───────────────────────────────────────────── */

export async function adjustBalance(input: z.output<typeof adjustBalanceSchema>, ctx: ActionContext) {
  const target = await assertInTeam(ctx.user, input.userId);
  assertNotSelf(ctx.user, input.userId);
  const type = await db.leaveType.findUnique({ where: { id: input.leaveTypeId } });
  if (!type) throw notFound("Leave type");

  const result = await db.$transaction(async (tx) => {
    await lock(tx, `leave:${input.userId}`);
    const before =
      (await userBalances(input.userId, input.year, tx)).find((b) => b.typeId === type.id)?.remaining ?? 0;
    const entry = await tx.leaveLedgerEntry.create({
      data: { ...input, kind: "ADJUSTMENT", actorId: ctx.user.id },
    });
    await audit(
      {
        action: "leave.adjust",
        actorId: ctx.user.id,
        targetType: "User",
        targetId: input.userId,
        before: { remaining: before },
        after: {
          remaining: before + input.delta,
          delta: input.delta,
          type: type.name,
          year: input.year,
          reason: input.reason,
          ledgerEntryId: entry.id,
        },
        meta: ctx.meta,
      },
      tx,
    );
    return { remaining: before + input.delta };
  });
  const sign = input.delta > 0 ? "+" : "";
  await notifyWithEmail([target.id], {
    kind: "leave.adjusted",
    title: `Your ${type.name} leave balance changed (${sign}${input.delta})`,
    body: input.reason,
    href: "/portal/leaves",
  });
  return result;
}

/** Credits the yearly quota once per person and type, plus optional carry-forward. Safe to repeat. */
export async function bulkAllocate(input: { year: number; carryForward: boolean }, ctx: ActionContext) {
  const [users, types] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, select: { id: true } }),
    db.leaveType.findMany({ where: { isActive: true, isUnlimited: false } }),
  ]);
  return db.$transaction(
    async (tx) => {
      await lock(tx, "leave:bulk-allocate");
      const existing = await tx.leaveLedgerEntry.findMany({
        where: { year: input.year, kind: { in: ["ALLOCATION", "CARRY_FORWARD"] } },
        select: { userId: true, leaveTypeId: true, kind: true },
      });
      const has = new Set(existing.map((e) => `${e.userId}:${e.leaveTypeId}:${e.kind}`));
      const closing = input.carryForward
        ? await balancesFor(
            users.map((u) => u.id),
            input.year - 1,
            tx,
          )
        : new Map<string, TypeBalance[]>();
      const rows: Prisma.LeaveLedgerEntryCreateManyInput[] = [];
      for (const u of users)
        for (const t of types) {
          const base = { userId: u.id, leaveTypeId: t.id, year: input.year, actorId: ctx.user.id };
          const quota = Number(t.yearlyQuota);
          if (quota > 0 && !has.has(`${u.id}:${t.id}:ALLOCATION`))
            rows.push({
              ...base,
              delta: quota,
              kind: "ALLOCATION",
              reason: `Yearly allocation ${input.year}`,
            });
          const left = closing.get(u.id)?.find((b) => b.typeId === t.id)?.remaining ?? 0;
          const carried = carryForwardDays(left, {
            carryForward: t.carryForward,
            maxCarryForward: Number(t.maxCarryForward),
          });
          if (carried > 0 && !has.has(`${u.id}:${t.id}:CARRY_FORWARD`))
            rows.push({
              ...base,
              delta: carried,
              kind: "CARRY_FORWARD",
              reason: `Carried forward from ${input.year - 1}`,
            });
        }
      if (rows.length) await tx.leaveLedgerEntry.createMany({ data: rows });
      await audit(
        {
          action: "leave.bulk_allocate",
          actorId: ctx.user.id,
          targetType: "LeaveLedger",
          targetId: String(input.year),
          after: { ...input, entries: rows.length },
          meta: ctx.meta,
        },
        tx,
      );
      return { created: rows.length };
    },
    { timeout: 60_000 },
  );
}

/* ── Reads ────────────────────────────────────────────────────────────────── */

const requestInclude = {
  leaveType: { select: { name: true, color: true } },
  user: { select: { id: true, name: true, employeeCode: true, designation: true } },
  approver: { select: { name: true } },
} as const;

const shape = (r: Prisma.LeaveRequestGetPayload<{ include: typeof requestInclude }>) => ({
  id: r.id,
  user: r.user,
  type: r.leaveType,
  from: fromDbDate(r.fromDate),
  to: fromDbDate(r.toDate),
  firstHalfDay: r.firstHalfDay,
  lastHalfDay: r.lastHalfDay,
  days: Number(r.days),
  reason: r.reason,
  status: r.status,
  approver: r.approver?.name ?? null,
  decisionNote: r.decisionNote,
  createdAt: r.createdAt.toISOString(),
  decidedAt: r.decidedAt?.toISOString() ?? null,
});
export type LeaveRow = ReturnType<typeof shape>;

export async function ownLeaves(userId: string, take = 100): Promise<LeaveRow[]> {
  const rows = await db.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: requestInclude,
  });
  return rows.map(shape);
}

export async function teamLeaves(
  viewer: CurrentUser,
  filter: {
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    userId?: string;
    from?: ISODate;
    to?: ISODate;
  } = {},
  take = 200,
): Promise<LeaveRow[]> {
  const scope = await teamWhere(viewer);
  const rows = await db.leaveRequest.findMany({
    where: {
      user: scope,
      status: filter.status,
      userId: filter.userId,
      ...(filter.to ? { fromDate: { lte: toDbDate(filter.to) } } : {}),
      ...(filter.from ? { toDate: { gte: toDbDate(filter.from) } } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take,
    include: requestInclude,
  });
  return rows.map(shape);
}

export async function ledgerFor(userId: string, year: number) {
  const rows = await db.leaveLedgerEntry.findMany({
    where: { userId, year },
    orderBy: { createdAt: "desc" },
    include: { leaveType: { select: { name: true, color: true } }, actor: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.leaveType,
    delta: Number(r.delta),
    kind: r.kind,
    reason: r.reason,
    actor: r.actor?.name ?? "System",
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listLeaveTypes(includeInactive = false) {
  const rows = await db.leaveType.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    isPaid: t.isPaid,
    isUnlimited: t.isUnlimited,
    yearlyQuota: Number(t.yearlyQuota),
    carryForward: t.carryForward,
    maxCarryForward: Number(t.maxCarryForward),
    isActive: t.isActive,
  }));
}
export type LeaveTypeRow = Awaited<ReturnType<typeof listLeaveTypes>>[number];

export async function saveLeaveType(input: z.output<typeof leaveTypeSchema>, ctx: ActionContext) {
  const { id, ...data } = input;
  const duplicate = await db.leaveType.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" }, NOT: id ? { id } : undefined },
  });
  if (duplicate) throw conflict("A leave type with that name already exists.");
  const before = id ? await db.leaveType.findUnique({ where: { id } }) : null;
  if (id && !before) throw notFound("Leave type");
  const saved = id
    ? await db.leaveType.update({ where: { id }, data })
    : await db.leaveType.create({ data: { ...data, sortOrder: (await db.leaveType.count()) + 1 } });
  await audit({
    action: id ? "leavetype.update" : "leavetype.create",
    actorId: ctx.user.id,
    targetType: "LeaveType",
    targetId: saved.id,
    before,
    after: data,
    meta: ctx.meta,
  });
  return { id: saved.id };
}

export async function deleteLeaveType(id: string, ctx: ActionContext) {
  const type = await db.leaveType.findUnique({
    where: { id },
    include: { _count: { select: { requests: true, ledger: true } } },
  });
  if (!type) throw notFound("Leave type");
  if (type._count.requests || type._count.ledger)
    throw conflict("This type already has history. Mark it inactive instead.");
  await db.leaveType.delete({ where: { id } });
  await audit({
    action: "leavetype.delete",
    actorId: ctx.user.id,
    targetType: "LeaveType",
    targetId: id,
    before: { name: type.name },
    meta: ctx.meta,
  });
}
