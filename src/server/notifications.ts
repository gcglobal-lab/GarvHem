import "server-only";
import { db, type Db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env, isEmailConfigured } from "@/lib/env";

export type NotifyInput = { kind: string; title: string; body?: string; href?: string };

export async function notify(userIds: Iterable<string>, n: NotifyInput, client: Db = db) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  await client.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      kind: n.kind,
      title: n.title.slice(0, 200),
      body: (n.body ?? "").slice(0, 500),
      href: n.href,
    })),
  });
}

/** In-app notification, plus an email when a provider is configured. Call after the transaction commits. */
export async function notifyWithEmail(userIds: Iterable<string>, n: NotifyInput) {
  const ids = [...new Set(userIds)].filter(Boolean);
  await notify(ids, n);
  if (!isEmailConfigured() || !ids.length) return;
  const users = await db.user.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { email: true },
  });
  await Promise.all(
    users.map((u) =>
      sendEmail({
        to: u.email,
        subject: n.title,
        heading: n.title,
        lines: n.body ? [n.body] : [],
        cta: n.href ? { label: "Open in the portal", url: env().APP_URL + n.href } : undefined,
      }),
    ),
  );
}

export async function listNotifications(userId: string, take = 15) {
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}

export async function markNotificationsRead(userId: string, id?: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null, ...(id ? { id } : {}) },
    data: { readAt: new Date() },
  });
}

/** Admins plus the person's manager: who should hear about an employee's request. */
export async function approversFor(user: { id: string; managerId: string | null }): Promise<string[]> {
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const ids = new Set(admins.map((a) => a.id));
  if (user.managerId) ids.add(user.managerId);
  ids.delete(user.id);
  return [...ids];
}
