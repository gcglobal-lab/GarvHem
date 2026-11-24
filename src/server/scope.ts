import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { forbiddenError, notFound } from "@/lib/errors";
import { getSettings } from "./settings";

/** users.manage is the marker of an unscoped (company-wide) account. */
export const isCompanyWide = (user: CurrentUser) => user.permissions.has("users.manage");

/** Which users a manager or admin may see. With team scope on, a manager sees only direct reports. */
export async function teamWhere(user: CurrentUser): Promise<Prisma.UserWhereInput> {
  if (isCompanyWide(user)) return {};
  const { team } = await getSettings();
  const base = { role: { not: "ADMIN" }, id: { not: user.id } } as const; // never over admins or themselves
  return team.managerTeamScope ? { ...base, managerId: user.id } : base;
}

/** The same scope plus the viewer. An empty filter inside OR would match nothing, so never inline this. */
export async function teamOrSelfWhere(user: CurrentUser): Promise<Prisma.UserWhereInput> {
  if (isCompanyWide(user)) return {};
  return { OR: [await teamWhere(user), { id: user.id }] };
}

/** Object-level check: is this person inside the viewer's team? Answers 404 so ids reveal nothing. */
export async function assertInTeam(user: CurrentUser, targetUserId: string) {
  const found = await db.user.findFirst({ where: { AND: [{ id: targetUserId }, await teamWhere(user)] } });
  if (!found) throw notFound("Employee");
  return found;
}

/** Changing your own attendance, balance or leave decision needs company-wide rights. */
export function assertNotSelf(user: CurrentUser, targetUserId: string) {
  if (user.id === targetUserId && !isCompanyWide(user)) throw forbiddenError();
}

const memberSelect = {
  id: true,
  name: true,
  employeeCode: true,
  designation: true,
  department: true,
  role: true,
  joiningDate: true,
  shiftStart: true,
  shiftEnd: true,
  isActive: true,
} as const satisfies Prisma.UserSelect;

export async function teamMembers(user: CurrentUser, opts: { includeInactive?: boolean } = {}) {
  return db.user.findMany({
    where: { AND: [await teamWhere(user), opts.includeInactive ? {} : { isActive: true }] },
    orderBy: { name: "asc" },
    select: memberSelect,
  });
}
export type TeamMember = Awaited<ReturnType<typeof teamMembers>>[number];

export const memberById = (id: string): Promise<TeamMember> =>
  db.user.findUniqueOrThrow({ where: { id }, select: memberSelect });
