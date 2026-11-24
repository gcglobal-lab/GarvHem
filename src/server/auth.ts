import "server-only";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblems, verifyDummy, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  hashToken,
  lockUserSessions,
  newOpaqueToken,
  revokeAllSessions,
  type IssuedTokens,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { AppError, invalid, notFound } from "@/lib/errors";
import { enforceLimit, ipBudget, rateLimiter } from "@/lib/rate-limit";
import type { RequestMeta } from "@/lib/request";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
const WINDOW = LOCK_MINUTES * 60;
const IP_LIMIT = 30;

const INVALID = "Invalid email or password.";
const LOCKED = `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes or contact your administrator.`;

export const loginEmailKey = (email: string) => `login:email:${email}`;

export async function login(
  input: { email: string; password: string; rememberMe: boolean },
  meta: RequestMeta,
): Promise<{ tokens: IssuedTokens; mustChangePassword: boolean }> {
  const ipKey = `login:ip:${meta.ip}`;
  const emailKey = loginEmailKey(input.email);
  const limiter = rateLimiter();

  await enforceLimit(ipKey, ipBudget(meta.ip, IP_LIMIT), WINDOW, LOCKED);
  // One mechanism for every address, real or not, so a lockout reveals nothing.
  const attempt = await limiter.consume(emailKey, MAX_FAILED_LOGINS, WINDOW);
  const user = await db.user.findUnique({ where: { email: input.email } });

  if (!attempt.allowed) {
    await verifyDummy(input.password);
    throw new AppError("RATE_LIMITED", LOCKED);
  }

  const valid = user ? await verifyPassword(user.passwordHash, input.password) : false;
  if (!user) await verifyDummy(input.password);
  const expired = Boolean(
    user?.mustChangePassword && user.tempPasswordExpiresAt && user.tempPasswordExpiresAt < new Date(),
  );

  if (!user || !valid || !user.isActive || expired) {
    const locking = attempt.count >= MAX_FAILED_LOGINS;
    if (locking) await limiter.extend(emailKey, WINDOW); // a full lock period from the last try
    await db.user.updateMany({
      where: { email: input.email },
      data: {
        failedLoginCount: attempt.count,
        ...(locking ? { lockedUntil: new Date(Date.now() + WINDOW * 1000) } : {}),
      },
    });
    await audit({
      action: locking ? "auth.lockout" : "auth.login_failed",
      actorLabel: input.email,
      targetType: user ? "User" : undefined,
      targetId: user?.id,
      meta,
    });
    throw new AppError("UNAUTHENTICATED", INVALID);
  }

  await Promise.all([limiter.reset(emailKey), limiter.refund(ipKey)]);
  return db.$transaction(async (tx) => {
    await lockUserSessions(tx, user.id);
    // Re-read under the lock: the password may have changed while it was being verified.
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!fresh.isActive || fresh.passwordHash !== user.passwordHash)
      throw new AppError("UNAUTHENTICATED", INVALID);
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const tokens = await createSession(updated, { rememberMe: input.rememberMe, meta }, tx);
    await audit({ action: "auth.login", actorId: user.id, targetType: "User", targetId: user.id, meta }, tx);
    return { tokens, mustChangePassword: updated.mustChangePassword };
  });
}

function assertPolicy(password: string, user: { name: string; email: string }) {
  const problems = passwordProblems(password, [user.email, ...user.name.split(/\s+/)]);
  if (problems.length) throw invalid(problems[0]!, { newPassword: problems.join(" ") });
}

/** Changes the password, ends every session and returns a fresh one for this device. */
export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  meta: RequestMeta,
): Promise<IssuedTokens> {
  await enforceLimit(`pwchange:${userId}`, 8, WINDOW);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");
  if (!(await verifyPassword(user.passwordHash, input.currentPassword)))
    throw invalid("Your current password is incorrect.", { currentPassword: "Incorrect password" });
  assertPolicy(input.newPassword, user);
  const passwordHash = await hashPassword(input.newPassword);

  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, tempPasswordExpiresAt: null },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await revokeAllSessions(userId, tx);
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await audit(
      { action: "auth.password_changed", actorId: userId, targetType: "User", targetId: userId, meta },
      tx,
    );
    return createSession(fresh, { rememberMe: false, meta }, tx);
  });
}

export async function limitPasswordReset(email: string, meta: RequestMeta) {
  await enforceLimit(`pwreset:ip:${meta.ip}`, ipBudget(meta.ip, 5), 3600);
  // Per sender first, so a stranger cannot use up someone else's requests.
  await enforceLimit(`pwreset:email:${email}:${meta.ip}`, 3, 3600);
  await enforceLimit(`pwreset:email:${email}`, 10, 3600);
}

/** Run after the response is sent, so timing never reveals whether an account exists. */
export async function requestPasswordReset(email: string, meta: RequestMeta) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.isActive) return;
  const token = newOpaqueToken();
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
    }),
  ]);
  await audit({
    action: "auth.reset_requested",
    targetType: "User",
    targetId: user.id,
    actorLabel: email,
    meta,
  });
  await sendEmail({
    to: user.email,
    subject: "Reset your GARVHEM password",
    heading: "Reset your password",
    lines: [
      `Hi ${user.name},`,
      "Use the button below to choose a new password. The link works once and expires in 30 minutes.",
      "If you did not ask for this, you can ignore this email.",
    ],
    cta: { label: "Choose a new password", url: `${env().APP_URL}/reset-password?token=${token}` },
  });
}

export async function resetPasswordWithToken(
  input: { token: string; newPassword: string },
  meta: RequestMeta,
) {
  await enforceLimit(`pwreset:use:${meta.ip}`, ipBudget(meta.ip, 10), 3600);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive)
    throw invalid("This reset link is invalid or has expired.");
  assertPolicy(input.newPassword, record.user);
  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw invalid("This reset link is invalid or has expired.");
    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    await revokeAllSessions(record.userId, tx);
    await audit(
      {
        action: "auth.password_reset",
        actorId: record.userId,
        targetType: "User",
        targetId: record.userId,
        meta,
      },
      tx,
    );
  });
  await rateLimiter().reset(loginEmailKey(record.user.email));
}
