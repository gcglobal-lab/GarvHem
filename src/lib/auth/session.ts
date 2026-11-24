import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { db, type Tx } from "@/lib/db";
import type { RequestMeta } from "@/lib/request";
import { signAccessToken } from "./jwt";

const DAY = 86_400_000;
export const SESSION_DAYS = 7;
export const REMEMBER_DAYS = 30;
/**
 * Two tabs can present the same refresh token at the same moment. Inside this window the second
 * request gets an access token only (no new refresh token); after it, reuse is treated as theft.
 */
export const REUSE_GRACE_MS = 15_000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newOpaqueToken = () => randomBytes(32).toString("base64url");

type SessionUser = { id: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; tokenVersion: number };
export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  persistent: boolean;
};

/** Every change to a user's sessions happens under this row lock, so revoking can never race a refresh. */
export async function lockUserSessions(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE`;
}

const access = (user: SessionUser, familyId: string) =>
  signAccessToken({ sub: user.id, role: user.role, sid: familyId, ver: user.tokenVersion });

/** Call with the user row locked and freshly read. */
export async function createSession(
  user: SessionUser,
  opts: { rememberMe: boolean; meta: RequestMeta },
  tx: Tx,
): Promise<IssuedTokens> {
  const refreshToken = newOpaqueToken();
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + (opts.rememberMe ? REMEMBER_DAYS : SESSION_DAYS) * DAY);
  await tx.session.create({
    data: {
      familyId,
      userId: user.id,
      tokenVersion: user.tokenVersion,
      refreshTokenHash: hashToken(refreshToken),
      rememberMe: opts.rememberMe,
      expiresAt,
      ip: opts.meta.ip,
      userAgent: opts.meta.userAgent,
    },
  });
  return { accessToken: await access(user, familyId), refreshToken, expiresAt, persistent: opts.rememberMe };
}

export type RefreshDecision = "rotate" | "grace" | "reuse" | "expired";

/** Pure decision, unit-tested separately from the database. */
export function decideRefresh(
  s: { revokedAt: Date | null; replacedById: string | null; expiresAt: Date },
  now: Date,
): RefreshDecision {
  if (s.revokedAt) {
    const recentRotation = s.replacedById && now.getTime() - s.revokedAt.getTime() <= REUSE_GRACE_MS;
    return recentRotation ? "grace" : "reuse";
  }
  return s.expiresAt <= now ? "expired" : "rotate";
}

export type RefreshResult =
  | { kind: "rotated"; tokens: IssuedTokens; userId: string }
  | { kind: "grace"; accessToken: string; userId: string }
  | { kind: "invalid" };

export async function refreshSession(
  refreshToken: string | undefined,
  meta: RequestMeta,
): Promise<RefreshResult> {
  if (!refreshToken || refreshToken.length > 200) return { kind: "invalid" };
  const refreshTokenHash = hashToken(refreshToken);

  // Unknown tokens cost one indexed read: no transaction, no lock.
  const known = await db.session.findUnique({ where: { refreshTokenHash }, select: { userId: true } });
  if (!known) return { kind: "invalid" };

  return db.$transaction(async (tx): Promise<RefreshResult> => {
    await lockUserSessions(tx, known.userId);
    const session = await tx.session.findUnique({ where: { refreshTokenHash }, include: { user: true } });
    if (!session || session.tokenVersion !== session.user.tokenVersion) return { kind: "invalid" };
    const { user } = session;
    const now = new Date();
    const decision = decideRefresh(session, now);

    if (decision === "reuse") {
      // Rows are deleted, so stale tokens on other devices look unknown instead of raising the alarm again.
      await revokeAllSessions(user.id, tx);
      await audit(
        { action: "auth.refresh_reuse", actorId: user.id, targetType: "User", targetId: user.id, meta },
        tx,
      );
      return { kind: "invalid" };
    }
    if (decision === "expired" || !user.isActive) return { kind: "invalid" };

    if (decision === "grace") {
      const alive = await tx.session.findFirst({
        where: { familyId: session.familyId, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (!alive) return { kind: "invalid" };
      return { kind: "grace", accessToken: await access(user, session.familyId), userId: user.id };
    }

    const nextToken = newOpaqueToken();
    const next = await tx.session.create({
      data: {
        familyId: session.familyId,
        userId: user.id,
        refreshTokenHash: hashToken(nextToken),
        tokenVersion: session.tokenVersion,
        rememberMe: session.rememberMe,
        expiresAt: session.expiresAt, // absolute lifetime: rotation never extends it
        ip: meta.ip,
        userAgent: meta.userAgent,
        createdAt: session.createdAt,
      },
    });
    await tx.session.update({
      where: { id: session.id },
      data: { revokedAt: now, replacedById: next.id, lastUsedAt: now },
    });
    return {
      kind: "rotated",
      userId: user.id,
      tokens: {
        accessToken: await access(user, session.familyId),
        refreshToken: nextToken,
        expiresAt: session.expiresAt,
        persistent: session.rememberMe,
      },
    };
  });
}

export async function revokeByRefreshToken(refreshToken: string | undefined) {
  if (!refreshToken) return null;
  const s = await db.session.findUnique({ where: { refreshTokenHash: hashToken(refreshToken) } });
  if (!s) return null;
  await revokeFamily(s.familyId, s.userId);
  return s.userId;
}

/** Removes the whole family, so a stale token later looks unknown rather than like theft. */
export const revokeFamily = (familyId: string, userId: string) =>
  db.$transaction(async (tx) => {
    await lockUserSessions(tx, userId);
    return tx.session.deleteMany({ where: { familyId, userId } });
  });

/** Kills refresh tokens and, through tokenVersion, every outstanding access token. */
export async function revokeAllSessions(userId: string, tx: Tx) {
  await lockUserSessions(tx, userId);
  await tx.session.deleteMany({ where: { userId } });
  await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

/** Whether a refresh would succeed, without rotating anything. */
export async function canRefresh(refreshToken: string | undefined) {
  if (!refreshToken || refreshToken.length > 200) return false;
  const s = await db.session.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    include: { user: { select: { isActive: true, tokenVersion: true } } },
  });
  return Boolean(
    s &&
    !s.revokedAt &&
    s.expiresAt > new Date() &&
    s.user.isActive &&
    s.user.tokenVersion === s.tokenVersion,
  );
}
