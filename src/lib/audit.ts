import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import type { RequestMeta } from "./request";

export type AuditInput = {
  action: string;
  actorId?: string | null;
  actorLabel?: string | null;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  meta?: Partial<RequestMeta>;
};

const SENSITIVE = /password|token|secret|hash/i;

function clean(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (key, v: unknown) =>
      key && SENSITIVE.test(key) && typeof v === "string" ? "[redacted]" : v,
    ),
  ) as Prisma.InputJsonValue;
}

export async function audit(input: AuditInput, client: Db = db) {
  await client.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      before: clean(input.before),
      after: clean(input.after),
      ip: input.meta?.ip,
      userAgent: input.meta?.userAgent,
    },
  });
}
