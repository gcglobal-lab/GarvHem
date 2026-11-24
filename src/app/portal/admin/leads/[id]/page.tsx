import type { Metadata } from "next";
import { ArrowLeft, Download, Mail, Paperclip, Phone, StickyNote } from "lucide-react";
import Link from "next/link";
import { LeadControls, LeadNoteForm } from "@/components/portal/lead-client";
import { LeadStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { orNotFound } from "@/lib/page";
import { formatDateTime, formatISODate } from "@/lib/time";
import { formatBytes } from "@/lib/utils";
import { LEAD_STATUS_LABEL } from "@/lib/validators/leads";
import { leadDetail, leadOwners } from "@/server/leads";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("leads.view");
  const lead = await orNotFound(leadDetail((await params).id));
  const [owners, { company }] = await Promise.all([leadOwners(), getSettings()]);
  const tz = company.timezone;
  const canManage = user.permissions.has("leads.manage");
  const facts: [string, string | number | null][] = [
    ["Company", lead.company],
    ["Country", lead.country],
    ["Roles needed", lead.rolesNeeded],
    ["Headcount", lead.headcount],
    ["Budget", lead.budgetRange],
    ["Preferred start", lead.startDate ? formatISODate(lead.startDate) : null],
    ["Heard about us", lead.heardFrom],
    ["Source page", lead.sourcePage],
  ];

  return (
    <>
      <Link
        href="/portal/admin/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Leads
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="tabular text-sm text-muted">
            Lead {lead.number}, received {formatDateTime(lead.createdAt, tz)}
          </p>
          <h1 className="mt-0.5 flex flex-wrap items-center gap-3 text-2xl font-semibold sm:text-[28px]">
            {lead.fullName} <LeadStatusBadge status={lead.status} />
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`mailto:${lead.email}`}>
              <Mail aria-hidden /> Email
            </a>
          </Button>
          {lead.phone ? (
            <Button asChild variant="outline">
              <a href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}>
                <Phone aria-hidden /> Call
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Requirement" />
            <CardBody>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {lead.services.map((s) => (
                  <Badge key={s} tone="accent">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-line">
                {lead.requirement}
              </p>
              {lead.attachments.length ? (
                <ul className="mt-5 space-y-2">
                  {lead.attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                    >
                      <Paperclip className="size-4 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.filename}</span>
                      <span className="text-xs text-muted">{formatBytes(a.size)}</span>
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={`/api/portal/attachments/${a.id}`}
                          download
                          aria-label={`Download ${a.filename}`}
                        >
                          <Download aria-hidden />
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Email</dt>
                  <dd className="min-w-0 truncate font-medium">{lead.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-medium">{lead.phone ?? "-"}</dd>
                </div>
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v ?? "-"}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Internal notes" />
            <CardBody className="space-y-6">
              {canManage ? <LeadNoteForm leadId={lead.id} /> : null}
              {lead.notes.length ? (
                <ul className="space-y-4">
                  {lead.notes.map((n) => (
                    <li key={n.id} className="flex gap-3">
                      <Avatar name={n.author} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {n.author}{" "}
                          <span className="text-xs font-normal text-muted">
                            {formatDateTime(n.createdAt, tz)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-sm break-words whitespace-pre-line">{n.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={StickyNote} title="No notes yet" className="py-4" />
              )}
            </CardBody>
          </Card>
        </div>
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Pipeline" />
            <CardBody>
              <LeadControls
                key={`${lead.owner?.id}-${lead.followUpDate}`}
                id={lead.id}
                status={lead.status}
                ownerId={lead.owner?.id ?? ""}
                followUpDate={lead.followUpDate ?? ""}
                owners={owners}
                canManage={canManage}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Status history" />
            <CardBody>
              <ol className="space-y-3 text-sm">
                {lead.history.map((h) => (
                  <li key={h.id}>
                    <span className="font-medium">
                      {h.from ? `${LEAD_STATUS_LABEL[h.from]} to ` : "Created as "}
                      {LEAD_STATUS_LABEL[h.to]}
                    </span>
                    <span className="block text-xs text-muted">
                      {h.actor}, {formatDateTime(h.createdAt, tz)}
                    </span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
