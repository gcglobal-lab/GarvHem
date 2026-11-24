import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import { effectivePermissions } from "@/lib/auth/permissions";
import { managerToggles } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { invalid, notFound } from "@/lib/errors";
import { rateLimiter } from "@/lib/rate-limit";
import type { RequestMeta } from "@/lib/request";
import { fromDbDate, toDbDate } from "@/lib/time";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  type LeadData,
  type LeadFilter,
  type LeadStatusName,
} from "@/lib/validators/leads";
import { notify } from "./notifications";
import { getPublicCompany } from "./settings";
import { saveUpload, type PreparedUpload } from "./uploads";

async function usersWith(permission: "leads.view" | "leads.manage") {
  const toggles = await managerToggles();
  const users = await db.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return users.filter((u) => effectivePermissions(u.role, toggles).has(permission));
}

/** The address is unverified, so acknowledgements are capped per address and overall. */
async function mayAcknowledge(email: string) {
  const perAddress = await rateLimiter().consume(`lead:ack:${email}`, 2, 86_400);
  return perAddress.allowed && (await rateLimiter().consume("lead:ack:all", 200, 86_400)).allowed;
}

export async function createLead(data: LeadData, upload: PreparedUpload | null, meta: RequestMeta) {
  const { consent: _consent, startDate, ...rest } = data;
  const lead = await db.lead.create({
    data: {
      ...rest,
      startDate: startDate ? toDbDate(startDate) : null,
      consentAt: new Date(),
      ip: meta.ip,
      userAgent: meta.userAgent,
      history: { create: { toStatus: "NEW" } },
    },
  });
  if (upload) {
    try {
      await saveUpload(upload, { leadId: lead.id }, null);
    } catch (error) {
      // The enquiry matters more than its attachment: keep it and tell the team.
      console.error("[lead] attachment failed:", error instanceof Error ? error.message : "unknown");
      await db.leadNote.create({
        data: { leadId: lead.id, body: `System: the attachment "${upload.filename}" could not be stored.` },
      });
    }
  }
  const viewers = await usersWith("leads.view");
  await notify(
    viewers.map((v) => v.id),
    {
      kind: "lead.new",
      title: `New lead: ${lead.fullName}${lead.company ? `, ${lead.company}` : ""}`,
      body: `${lead.country}: ${lead.services.join(", ")}`,
      href: `/portal/admin/leads/${lead.id}`,
    },
  );
  const company = await getPublicCompany();
  const adminTo = env().ADMIN_NOTIFY_EMAIL ?? company.email;
  await Promise.all([
    adminTo
      ? sendEmail({
          to: adminTo,
          replyTo: lead.email,
          subject: `New lead: ${lead.fullName} (${lead.country})`,
          heading: "New website enquiry",
          lines: [
            `Name: ${lead.fullName}`,
            `Email: ${lead.email}`,
            `Company: ${lead.company ?? "-"}`,
            `Phone: ${lead.phone ?? "-"}`,
            `Services: ${lead.services.join(", ")}`,
            `Budget: ${lead.budgetRange ?? "-"}`,
            lead.requirement,
          ],
          cta: { label: "Open the lead", url: `${env().APP_URL}/portal/admin/leads/${lead.id}` },
        })
      : null,
    (await mayAcknowledge(lead.email)) &&
      sendEmail({
        to: lead.email,
        subject: "We received your enquiry",
        heading: "Thank you for contacting GARVHEM", // never repeat visitor text to an unverified address
        lines: [
          "Your message has reached the GARVHEM team. We will get back to you within 24 hours on business days.",
          "If you need to add anything, just reply to this email.",
        ],
        replyTo: company.email || undefined,
      }),
  ]);
  return lead;
}

/* ── Reads ────────────────────────────────────────────────────────────────── */

function whereFor(f: Partial<LeadFilter>): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    and.push({
      OR: [{ fullName: contains }, { email: contains }, { company: contains }, { requirement: contains }],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.country) and.push({ country: f.country });
  if (f.service) and.push({ services: { has: f.service } });
  if (f.owner) and.push({ ownerId: f.owner === "none" ? null : f.owner });
  return { AND: and };
}

const listInclude = {
  owner: { select: { id: true, name: true } },
  _count: { select: { notes: true, attachments: true } },
} as const satisfies Prisma.LeadInclude;

export async function listLeads(filter: Partial<LeadFilter> = {}, take = 500) {
  const rows = await db.lead.findMany({
    where: whereFor(filter),
    orderBy: { createdAt: "desc" },
    take,
    include: listInclude,
  });
  return rows.map((l) => ({
    id: l.id,
    number: l.number,
    fullName: l.fullName,
    email: l.email,
    company: l.company,
    country: l.country,
    phone: l.phone,
    services: l.services,
    budgetRange: l.budgetRange,
    headcount: l.headcount,
    sourcePage: l.sourcePage,
    status: l.status,
    owner: l.owner,
    followUpDate: l.followUpDate ? fromDbDate(l.followUpDate) : null,
    createdAt: l.createdAt.toISOString(),
    notes: l._count.notes,
    attachments: l._count.attachments,
    requirement: l.requirement,
  }));
}
export type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];

export async function leadDetail(id: string) {
  const who = { select: { id: true, name: true } } as const;
  const l = await db.lead.findUnique({
    where: { id },
    include: {
      owner: who,
      notes: { orderBy: { createdAt: "desc" }, include: { author: who } },
      history: { orderBy: { createdAt: "desc" }, include: { actor: who } },
      attachments: true,
    },
  });
  if (!l) throw notFound("Lead");
  return {
    id: l.id,
    number: l.number,
    fullName: l.fullName,
    email: l.email,
    company: l.company,
    country: l.country,
    phone: l.phone,
    services: l.services,
    rolesNeeded: l.rolesNeeded,
    headcount: l.headcount,
    budgetRange: l.budgetRange,
    startDate: l.startDate ? fromDbDate(l.startDate) : null,
    requirement: l.requirement,
    heardFrom: l.heardFrom,
    sourcePage: l.sourcePage,
    status: l.status,
    owner: l.owner,
    followUpDate: l.followUpDate ? fromDbDate(l.followUpDate) : null,
    createdAt: l.createdAt.toISOString(),
    attachments: l.attachments.map((a) => ({ id: a.id, filename: a.filename, size: a.size })),
    notes: l.notes.map((n) => ({
      id: n.id,
      body: n.body,
      author: n.author?.name ?? "System",
      createdAt: n.createdAt.toISOString(),
    })),
    history: l.history.map((h) => ({
      id: h.id,
      from: h.fromStatus,
      to: h.toStatus,
      actor: h.actor?.name ?? "Website",
      createdAt: h.createdAt.toISOString(),
    })),
  };
}
export type LeadDetail = Awaited<ReturnType<typeof leadDetail>>;

export const leadOwners = () => usersWith("leads.manage");
export const newLeadCount = () => db.lead.count({ where: { status: "NEW" } });

export async function leadStats(now = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [newThisWeek, groups, reached] = await Promise.all([
    db.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    db.lead.groupBy({ by: ["status"], _count: true }),
    db.$queryRaw<{ stage: number; leads: number }[]>`
      SELECT stage, COUNT(*)::int AS leads FROM (
        SELECT MAX(CASE "toStatus" WHEN 'CONTACTED' THEN 1 WHEN 'QUALIFIED' THEN 2 WHEN 'PROPOSAL_SENT' THEN 3
                                   WHEN 'WON' THEN 4 ELSE 0 END) AS stage
        FROM "LeadStatusHistory" GROUP BY "leadId"
      ) AS furthest GROUP BY stage`,
  ]);
  const total = groups.reduce((s, g) => s + g._count, 0);
  const pipeline: LeadStatusName[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON"];
  // A lead counts for every stage up to the furthest one it has reached.
  const reachedStage = (i: number) => reached.reduce((sum, r) => sum + (r.stage >= i ? r.leads : 0), 0);
  return {
    newThisWeek,
    total,
    byStatus: LEAD_STATUSES.map((s) => ({
      status: s,
      count: groups.find((g) => g.status === s)?._count ?? 0,
    })),
    funnel: pipeline.map((s, i) => ({
      stage: LEAD_STATUS_LABEL[s],
      count: i === 0 ? total : reachedStage(i),
    })),
  };
}

/* ── Writes ───────────────────────────────────────────────────────────────── */

export async function moveLead(input: { id: string; status: LeadStatusName }, ctx: ActionContext) {
  await db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: input.id } });
    if (!lead) throw notFound("Lead");
    if (lead.status === input.status) return;
    await tx.lead.update({ where: { id: lead.id }, data: { status: input.status } });
    await tx.leadStatusHistory.create({
      data: { leadId: lead.id, fromStatus: lead.status, toStatus: input.status, actorId: ctx.user.id },
    });
    await audit(
      {
        action: "lead.status",
        actorId: ctx.user.id,
        targetType: "Lead",
        targetId: lead.id,
        before: { status: lead.status },
        after: { status: input.status },
        meta: ctx.meta,
      },
      tx,
    );
  });
}

export async function updateLead(
  input: { id: string; ownerId: string | null; followUpDate: string | null },
  ctx: ActionContext,
) {
  const lead = await db.lead.findUnique({ where: { id: input.id } });
  if (!lead) throw notFound("Lead");
  if (input.ownerId && !(await leadOwners()).some((o) => o.id === input.ownerId))
    throw invalid("That person cannot own leads.");
  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        ownerId: input.ownerId,
        followUpDate: input.followUpDate ? toDbDate(input.followUpDate) : null,
      },
    });
    await audit(
      {
        action: "lead.update",
        actorId: ctx.user.id,
        targetType: "Lead",
        targetId: lead.id,
        before: { ownerId: lead.ownerId, followUpDate: lead.followUpDate },
        after: { ownerId: input.ownerId, followUpDate: input.followUpDate },
        meta: ctx.meta,
      },
      tx,
    );
    if (input.ownerId && input.ownerId !== lead.ownerId && input.ownerId !== ctx.user.id)
      await notify(
        [input.ownerId],
        {
          kind: "lead.assigned",
          title: `You now own the lead ${lead.fullName}`,
          body: `Assigned by ${ctx.user.name}`,
          href: `/portal/admin/leads/${lead.id}`,
        },
        tx,
      );
  });
}

export async function addLeadNote(input: { leadId: string; body: string }, ctx: ActionContext) {
  const lead = await db.lead.findUnique({ where: { id: input.leadId }, select: { id: true } });
  if (!lead) throw notFound("Lead");
  await db.leadNote.create({ data: { leadId: lead.id, authorId: ctx.user.id, body: input.body } });
}
