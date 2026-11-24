import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { revokeAllSessions, revokeFamily } from "@/lib/auth/session";
import { db, lock, type Tx } from "@/lib/db";
import { conflict, invalid, notFound } from "@/lib/errors";
import { rateLimiter } from "@/lib/rate-limit";
import { fromDbDate, toDbDate, workDateOf, yearOf } from "@/lib/time";
import type { z } from "zod";
import type { UserFilter, createUserSchema, updateUserSchema } from "@/lib/validators/users";
import { loginEmailKey } from "./auth";
import { getSettings } from "./settings";

const publicFields = {
  id: true,
  employeeCode: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  designation: true,
  department: true,
  managerId: true,
  joiningDate: true,
  shiftStart: true,
  shiftEnd: true,
  isActive: true,
  mustChangePassword: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  manager: { select: { id: true, name: true } },
} as const satisfies Prisma.UserSelect;

const shape = (u: Prisma.UserGetPayload<{ select: typeof publicFields }>) => ({
  ...u,
  joiningDate: u.joiningDate ? fromDbDate(u.joiningDate) : null,
  lockedUntil: u.lockedUntil && u.lockedUntil > new Date() ? u.lockedUntil.toISOString() : null,
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  createdAt: u.createdAt.toISOString(),
});
export type UserRow = ReturnType<typeof shape>;

export async function listUsers(f: UserFilter): Promise<UserRow[]> {
  const and: Prisma.UserWhereInput[] = [];
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    and.push({
      OR: [{ name: contains }, { email: contains }, { employeeCode: contains }, { designation: contains }],
    });
  }
  if (f.role) and.push({ role: f.role });
  if (f.status) and.push({ isActive: f.status === "active" });
  if (f.department) and.push({ department: f.department });
  const rows = await db.user.findMany({
    where: { AND: and },
    orderBy: [{ isActive: "desc" }, { employeeCode: "asc" }],
    select: publicFields,
  });
  return rows.map(shape);
}

export async function listDepartments(): Promise<string[]> {
  const rows = await db.user.findMany({
    where: { department: { not: null } },
    distinct: ["department"],
    select: { department: true },
    orderBy: { department: "asc" },
  });
  return rows.flatMap((r) => (r.department ? [r.department] : []));
}

export const listManagers = () =>
  db.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "MANAGER"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

export async function getUser(id: string): Promise<UserRow> {
  const u = await db.user.findUnique({ where: { id }, select: publicFields });
  if (!u) throw notFound("Employee");
  return shape(u);
}

/** GRV-001, GRV-002, … based on the highest number in use. */
export function nextEmployeeCode(existing: readonly string[]): string {
  const max = existing.reduce((m, c) => Math.max(m, Number(/^GRV-(\d+)$/.exec(c)?.[1] ?? 0)), 0);
  return `GRV-${String(max + 1).padStart(3, "0")}`;
}

export async function suggestEmployeeCode(client: Tx | typeof db = db) {
  const rows = await client.user.findMany({
    where: { employeeCode: { startsWith: "GRV-" } },
    select: { employeeCode: true },
  });
  return nextEmployeeCode(rows.map((r) => r.employeeCode));
}

const TEMP_PASSWORD_DAYS = 7;
const tempExpiry = () => new Date(Date.now() + TEMP_PASSWORD_DAYS * 86_400_000);

async function assertManager(managerId: string | null, selfId?: string) {
  if (!managerId) return;
  if (managerId === selfId)
    throw invalid("A person cannot be their own manager.", { managerId: "Pick someone else" });
  const ok = await db.user.count({
    where: { id: managerId, isActive: true, role: { in: ["ADMIN", "MANAGER"] } },
  });
  if (!ok) throw invalid("Pick an active manager or admin.", { managerId: "Not a manager" });
  // No loops: two managers must never be able to approve each other.
  const seen = new Set<string>();
  for (let current: string | null = managerId; current && !seen.has(current);) {
    seen.add(current);
    const next: { managerId: string | null } | null = await db.user.findUnique({
      where: { id: current },
      select: { managerId: true },
    });
    current = next?.managerId ?? null;
    if (selfId && current === selfId)
      throw invalid("That would make these two people each other's manager.", {
        managerId: "Creates a loop",
      });
  }
}

const emailTaken = () => conflict("Another user already has that email address.");

/** Returns the temporary password exactly once; only its hash is stored. */
export async function createUser(input: z.output<typeof createUserSchema>, ctx: ActionContext) {
  const managerId = input.role === "ADMIN" ? null : input.managerId;
  await assertManager(managerId);
  const temporaryPassword = generatePassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { allocations, employeeCode, joiningDate, ...rest } = input;
  const { company } = await getSettings();
  const year = yearOf(workDateOf(new Date(), company.timezone));

  const user = await db.$transaction(async (tx) => {
    await lock(tx, "users:create");
    if (await tx.user.findUnique({ where: { email: rest.email } })) throw emailTaken();
    const code = employeeCode ?? (await suggestEmployeeCode(tx));
    if (await tx.user.findUnique({ where: { employeeCode: code } }))
      throw conflict(`Employee ID ${code} is already in use.`);
    const created = await tx.user.create({
      data: {
        ...rest,
        managerId, // admins report to nobody
        tempPasswordExpiresAt: tempExpiry(),
        employeeCode: code,
        joiningDate: joiningDate ? toDbDate(joiningDate) : null,
        passwordHash,
        mustChangePassword: true,
      },
    });
    const credited = allocations.filter((a) => a.days > 0);
    if (credited.length)
      await tx.leaveLedgerEntry.createMany({
        data: credited.map((a) => ({
          userId: created.id,
          leaveTypeId: a.leaveTypeId,
          year,
          delta: a.days,
          kind: "ALLOCATION" as const,
          reason: `Initial allocation ${year}`,
          actorId: ctx.user.id,
        })),
      });
    await audit(
      {
        action: "user.create",
        actorId: ctx.user.id,
        targetType: "User",
        targetId: created.id,
        after: {
          name: created.name,
          email: created.email,
          role: created.role,
          employeeCode: code,
          allocations: credited,
        },
        meta: ctx.meta,
      },
      tx,
    );
    return created;
  });
  return { id: user.id, name: user.name, email: user.email, temporaryPassword };
}

/** There must always be at least one active admin. */
async function assertNotLastAdmin(tx: Tx, userId: string) {
  await lock(tx, "users:admins");
  const others = await tx.user.count({ where: { role: "ADMIN", isActive: true, NOT: { id: userId } } });
  if (!others) throw conflict("This is the only active admin account.");
}

export async function updateUser(input: z.output<typeof updateUserSchema>, ctx: ActionContext) {
  const { id, joiningDate, ...fields } = input;
  const rest = { ...fields, managerId: fields.role === "ADMIN" ? null : fields.managerId };
  await assertManager(rest.managerId, id);
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id }, select: publicFields });
    if (!before) throw notFound("Employee");
    const clash = await tx.user.findUnique({ where: { email: rest.email } });
    if (clash && clash.id !== id) throw emailTaken();
    const roleChanged = before.role !== rest.role;
    if (roleChanged && before.role === "ADMIN") await assertNotLastAdmin(tx, id);
    if (roleChanged && id === ctx.user.id) throw conflict("You cannot change your own role.");
    await tx.user.update({
      where: { id },
      data: { ...rest, joiningDate: joiningDate ? toDbDate(joiningDate) : null },
    });
    const emailChanged = before.email !== rest.email;
    if (emailChanged) await tx.passwordResetToken.deleteMany({ where: { userId: id } });
    // The old role is inside existing tokens; an email change may follow a compromised mailbox.
    if (roleChanged || (emailChanged && id !== ctx.user.id)) await revokeAllSessions(id, tx);
    if (rest.role === "EMPLOYEE" && roleChanged)
      await tx.user.updateMany({ where: { managerId: id }, data: { managerId: null } });
    const { manager: _m, ...beforeData } = shape(before);
    await audit(
      {
        action: roleChanged ? "user.role_change" : "user.update",
        actorId: ctx.user.id,
        targetType: "User",
        targetId: id,
        before: beforeData,
        after: input,
        meta: ctx.meta,
      },
      tx,
    );
  });
}

export async function setUserActive(input: { id: string; isActive: boolean }, ctx: ActionContext) {
  if (input.id === ctx.user.id) throw conflict("You cannot deactivate your own account.");
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.id } });
    if (!user) throw notFound("Employee");
    if (!input.isActive && user.role === "ADMIN") await assertNotLastAdmin(tx, user.id);
    await tx.user.update({ where: { id: user.id }, data: { isActive: input.isActive } });
    if (!input.isActive) {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await revokeAllSessions(user.id, tx);
    }
    await audit(
      {
        action: input.isActive ? "user.reactivate" : "user.deactivate",
        actorId: ctx.user.id,
        targetType: "User",
        targetId: user.id,
        before: { isActive: user.isActive },
        after: { isActive: input.isActive },
        meta: ctx.meta,
      },
      tx,
    );
  });
}

export async function resetUserPassword(id: string, ctx: ActionContext) {
  if (id === ctx.user.id) throw conflict("Change your own password from your profile.");
  const temporaryPassword = generatePassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const user = await db.$transaction(async (tx) => {
    const found = await tx.user.findUnique({ where: { id } });
    if (!found) throw notFound("Employee");
    await tx.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        tempPasswordExpiresAt: tempExpiry(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });
    await revokeAllSessions(id, tx);
    await audit(
      {
        action: "user.password_reset",
        actorId: ctx.user.id,
        targetType: "User",
        targetId: id,
        meta: ctx.meta,
      },
      tx,
    );
    return found;
  });
  await rateLimiter().reset(loginEmailKey(user.email));
  return { name: user.name, email: user.email, temporaryPassword };
}

export async function logoutEverywhere(id: string, ctx: ActionContext) {
  await db.$transaction(async (tx) => {
    if (!(await tx.user.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Employee");
    await revokeAllSessions(id, tx);
    await audit(
      {
        action: "user.logout_everywhere",
        actorId: ctx.user.id,
        targetType: "User",
        targetId: id,
        meta: ctx.meta,
      },
      tx,
    );
  });
}

/* ── Own profile ──────────────────────────────────────────────────────────── */

export async function ownSessions(userId: string, currentFamily: string) {
  const rows = await db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });
  return rows.map((s) => ({
    familyId: s.familyId,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    current: s.familyId === currentFamily,
  }));
}
export type SessionRow = Awaited<ReturnType<typeof ownSessions>>[number];

export async function revokeOwnSession(familyId: string, ctx: ActionContext) {
  const { count } = await revokeFamily(familyId, ctx.user.id);
  if (!count) throw notFound("Session");
  await audit({
    action: "auth.session_revoked",
    actorId: ctx.user.id,
    targetType: "User",
    targetId: ctx.user.id,
    meta: ctx.meta,
  });
}

export async function revokeOtherSessions(ctx: ActionContext) {
  const { count } = await db.session.deleteMany({
    where: { userId: ctx.user.id, NOT: { familyId: ctx.user.sessionId } },
  });
  await audit({
    action: "auth.other_sessions_revoked",
    actorId: ctx.user.id,
    targetType: "User",
    targetId: ctx.user.id,
    after: { count },
    meta: ctx.meta,
  });
}

export async function updateOwnPhone(phone: string | null, ctx: ActionContext) {
  await db.user.update({ where: { id: ctx.user.id }, data: { phone } });
}
