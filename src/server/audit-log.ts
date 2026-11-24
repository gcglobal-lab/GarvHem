import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { addDaysISO, instantAt, isISODate } from "@/lib/time";
import { getSettings } from "./settings";

const PAGE_SIZE = 40;

export async function auditEntries(f: {
  action: string;
  actor: string;
  from: string;
  to: string;
  page: number;
}) {
  const { company } = await getSettings();
  const tz = company.timezone;
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.action)
    and.push({ action: f.action.endsWith(".*") ? { startsWith: f.action.slice(0, -1) } : f.action });
  if (f.actor) and.push({ actorId: f.actor });
  if (isISODate(f.from)) and.push({ createdAt: { gte: instantAt(f.from, "00:00", tz) } });
  if (isISODate(f.to)) and.push({ createdAt: { lt: instantAt(addDaysISO(f.to, 1), "00:00", tz) } });
  const where = { AND: and };
  const [rows, total, actions] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true } } },
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actor?.name ?? r.actorLabel ?? "System",
      targetType: r.targetType,
      targetId: r.targetId,
      before: r.before,
      after: r.after,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    actions: actions.map((a) => a.action),
  };
}
