import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppError, forbiddenError } from "@/lib/errors";
import { safeNext } from "@/lib/utils";
import { ACCESS_COOKIE } from "./cookies";
import { verifyAccessToken } from "./jwt";
import { effectivePermissions, type Permission, type RoleName } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  avatarUrl: string | null;
  managerId: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  mustChangePassword: boolean;
  sessionId: string;
  permissions: ReadonlySet<Permission>;
};

export async function managerToggles(): Promise<string[]> {
  const rows = await db.managerPermission.findMany({
    where: { enabled: true },
    select: { permission: true },
  });
  return rows.map((r) => r.permission);
}

/** Verifies the JWT, then the live user, tokenVersion and session on every request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const claims = await verifyAccessToken(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) return null;
  const [user, session] = await Promise.all([
    db.user.findUnique({ where: { id: claims.sub } }),
    db.session.findFirst({
      where: { familyId: claims.sid, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    }),
  ]);
  if (!user || !user.isActive || !session || user.tokenVersion !== claims.ver) return null;
  const permissions = effectivePermissions(user.role, user.role === "MANAGER" ? await managerToggles() : []);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeCode: user.employeeCode,
    designation: user.designation,
    department: user.department,
    avatarUrl: user.avatarUrl,
    managerId: user.managerId,
    shiftStart: user.shiftStart,
    shiftEnd: user.shiftEnd,
    mustChangePassword: user.mustChangePassword,
    sessionId: claims.sid,
    permissions,
  };
});

/* ── For Server Actions and Route Handlers: throw ─────────────────────────── */

export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Your session has ended. Please sign in again.");
  if (user.mustChangePassword && !opts.allowPasswordChange)
    throw new AppError("PASSWORD_CHANGE_REQUIRED", "Change your temporary password first.");
  return user;
}

export async function requirePermission(...permissions: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!permissions.every((p) => user.permissions.has(p))) throw forbiddenError();
  return user;
}

/* ── For pages and layouts: redirect, or answer 403 ───────────────────────── */

export async function requirePageUser(opts: { allowPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const path = safeNext((await headers()).get("x-pathname"));
    redirect(`/api/auth/expired?next=${encodeURIComponent(path)}`);
  }
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/change-password");
  return user;
}

export async function requirePagePermission(...permissions: Permission[]): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!permissions.every((p) => user.permissions.has(p))) forbidden();
  return user;
}
