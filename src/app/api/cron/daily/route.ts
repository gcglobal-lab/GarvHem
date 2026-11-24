import { createHash, timingSafeEqual } from "node:crypto";
import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { autoCloseOpenDays } from "@/server/attendance";

const digest = (v: string) => createHash("sha256").update(v).digest();

/** Vercel Cron calls this with "Authorization: Bearer CRON_SECRET". Safe to run more than once. */
export const GET = handler("cron.daily", async (req) => {
  const given = req.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(given), digest(`Bearer ${env().CRON_SECRET}`)))
    throw new AppError("UNAUTHENTICATED", "Unauthorized");
  const now = new Date();
  const closed = await autoCloseOpenDays(now);
  const old = new Date(now.getTime() - 90 * 86_400_000);
  const [sessions, resets, limits, notifications] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.notification.deleteMany({ where: { readAt: { not: null }, createdAt: { lt: old } } }),
  ]);
  return json({
    ok: true,
    attendanceClosed: closed,
    cleaned: {
      sessions: sessions.count,
      resets: resets.count,
      limits: limits.count,
      notifications: notifications.count,
    },
  });
});
