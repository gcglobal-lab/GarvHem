import "server-only";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import { CONFIGURABLE_MANAGER_PERMISSIONS, type ConfigurablePermission } from "@/lib/auth/permissions";
import { managerToggles } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { fromDbDate, instantAt, toDbDate, workDateOf } from "@/lib/time";
import type { z } from "zod";
import type { announcementSchema, holidaySchema } from "@/lib/validators/settings";
import { notify } from "./notifications";
import { getSettings, loadSettings } from "./settings";

/* ── Manager permissions ──────────────────────────────────────────────────── */

export async function managerPermissionStates() {
  const enabled = new Set(await managerToggles());
  return CONFIGURABLE_MANAGER_PERMISSIONS.map((permission) => ({
    permission,
    enabled: enabled.has(permission),
  }));
}

export async function setManagerPermission(
  input: { permission: ConfigurablePermission; enabled: boolean },
  ctx: ActionContext,
) {
  const before = (await managerToggles()).includes(input.permission);
  await db.$transaction(async (tx) => {
    await tx.managerPermission.upsert({
      where: { permission: input.permission },
      create: input,
      update: { enabled: input.enabled },
    });
    await audit(
      {
        action: "settings.manager_permission",
        actorId: ctx.user.id,
        targetType: "ManagerPermission",
        targetId: input.permission,
        before: { enabled: before },
        after: { enabled: input.enabled },
        meta: ctx.meta,
      },
      tx,
    );
  });
}

/* ── Holidays ─────────────────────────────────────────────────────────────── */

export async function listHolidays(year: number) {
  const rows = await db.holiday.findMany({
    where: { date: { gte: toDbDate(`${year}-01-01`), lte: toDbDate(`${year}-12-31`) } },
    orderBy: { date: "asc" },
  });
  return rows.map((h) => ({ id: h.id, date: fromDbDate(h.date), name: h.name, isOptional: h.isOptional }));
}
export type HolidayRow = Awaited<ReturnType<typeof listHolidays>>[number];

export async function upcomingHolidays(take = 5) {
  const { company } = await getSettings();
  const today = workDateOf(new Date(), company.timezone);
  const rows = await db.holiday.findMany({
    where: { date: { gte: toDbDate(today) } },
    orderBy: { date: "asc" },
    take,
  });
  return rows.map((h) => ({ id: h.id, date: fromDbDate(h.date), name: h.name, isOptional: h.isOptional }));
}

export async function saveHoliday(input: z.output<typeof holidaySchema>, ctx: ActionContext) {
  const { id, date, ...rest } = input;
  const same = await db.holiday.findUnique({ where: { date: toDbDate(date) } });
  if (same && same.id !== id) throw conflict(`${same.name} is already on that date.`);
  const data = { ...rest, date: toDbDate(date) };
  const before = id ? await db.holiday.findUnique({ where: { id } }) : null;
  if (id && !before) throw notFound("Holiday");
  const saved = id ? await db.holiday.update({ where: { id }, data }) : await db.holiday.create({ data });
  await audit({
    action: id ? "holiday.update" : "holiday.create",
    actorId: ctx.user.id,
    targetType: "Holiday",
    targetId: saved.id,
    before,
    after: { date, ...rest },
    meta: ctx.meta,
  });
}

export async function deleteHoliday(id: string, ctx: ActionContext) {
  const found = await db.holiday.findUnique({ where: { id } });
  if (!found) throw notFound("Holiday");
  await db.holiday.delete({ where: { id } });
  await audit({
    action: "holiday.delete",
    actorId: ctx.user.id,
    targetType: "Holiday",
    targetId: id,
    before: { date: fromDbDate(found.date), name: found.name },
    meta: ctx.meta,
  });
}

/* ── Announcements ────────────────────────────────────────────────────────── */

export async function listAnnouncements(opts: { activeOnly?: boolean; take?: number } = {}) {
  const rows = await db.announcement.findMany({
    where: opts.activeOnly ? { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } : {},
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: opts.take ?? 50,
    include: { author: { select: { name: true } } },
  });
  const { company } = await getSettings();
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    expiresOn: a.expiresAt ? workDateOf(a.expiresAt, company.timezone) : null,
    author: a.author?.name ?? "GARVHEM",
    createdAt: a.createdAt.toISOString(),
  }));
}
export type AnnouncementRow = Awaited<ReturnType<typeof listAnnouncements>>[number];

export async function saveAnnouncement(input: z.output<typeof announcementSchema>, ctx: ActionContext) {
  const { id, expiresOn, notifyEveryone, ...rest } = input;
  const { company } = await loadSettings();
  const data = { ...rest, expiresAt: expiresOn ? instantAt(expiresOn, "23:59", company.timezone) : null };
  if (id && !(await db.announcement.findUnique({ where: { id } }))) throw notFound("Announcement");
  const saved = id
    ? await db.announcement.update({ where: { id }, data })
    : await db.announcement.create({ data: { ...data, authorId: ctx.user.id } });
  await audit({
    action: id ? "announcement.update" : "announcement.create",
    actorId: ctx.user.id,
    targetType: "Announcement",
    targetId: saved.id,
    after: { title: rest.title },
    meta: ctx.meta,
  });
  if (notifyEveryone) {
    const users = await db.user.findMany({ where: { isActive: true }, select: { id: true } });
    await notify(
      users.map((u) => u.id).filter((u) => u !== ctx.user.id),
      { kind: "announcement", title: rest.title, body: rest.body, href: "/portal" },
    );
  }
}

export async function deleteAnnouncement(id: string, ctx: ActionContext) {
  const found = await db.announcement.findUnique({ where: { id } });
  if (!found) throw notFound("Announcement");
  await db.announcement.delete({ where: { id } });
  await audit({
    action: "announcement.delete",
    actorId: ctx.user.id,
    targetType: "Announcement",
    targetId: id,
    before: { title: found.title },
    meta: ctx.meta,
  });
}
