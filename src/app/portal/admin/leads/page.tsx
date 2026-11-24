import type { Metadata } from "next";
import { Download, Inbox, KanbanSquare, List } from "lucide-react";
import Link from "next/link";
import { Rows } from "@/components/portal/charts";
import { LeadBoard } from "@/components/portal/lead-client";
import { PageHeader, Stat } from "@/components/portal/page-header";
import { LeadStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { formatDateTime, formatISODate } from "@/lib/time";
import {
  COUNTRIES,
  LEAD_SERVICES,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  leadFilterSchema,
} from "@/lib/validators/leads";
import { leadOwners, leadStats, listLeads } from "@/server/leads";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("leads.view");
  const p = await flatParams(searchParams);
  const filter = leadFilterSchema.parse(p);
  const view = p.view === "board" ? "board" : "table";
  const [leads, owners, stats, { company }] = await Promise.all([
    listLeads(filter),
    leadOwners(),
    leadStats(),
    getSettings(),
  ]);
  const active = Object.entries(filter).filter(([, v]) => v);
  const count = (s: string) => stats.byStatus.find((x) => x.status === s)?.count ?? 0;
  const link = (v: string) => `/portal/admin/leads?${new URLSearchParams([...active, ["view", v]])}`;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every enquiry from the website."
        actions={
          <>
            <LinkTabs
              label="Lead view"
              items={[
                {
                  href: link("table"),
                  label: (
                    <>
                      <List aria-hidden /> Table
                    </>
                  ),
                  active: view === "table",
                },
                {
                  href: link("board"),
                  label: (
                    <>
                      <KanbanSquare aria-hidden /> Pipeline
                    </>
                  ),
                  active: view === "board",
                },
              ]}
            />
            <Button asChild variant="outline">
              <a href={`/api/portal/admin/export/leads?${new URLSearchParams(active)}`}>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="New this week" value={stats.newThisWeek} />
          <Stat label="Waiting for a reply" value={count("NEW")} />
          <Stat label="Won" value={count("WON")} />
          <Stat label="Lost" value={count("LOST")} />
        </div>
        <Card>
          <CardHeader title="Conversion funnel" description="Leads that reached each stage" />
          <CardBody className="pt-3">
            <Rows
              label="Leads that reached each stage"
              xKey="stage"
              series={[{ key: "count", label: "Leads", color: 3 }]}
              data={stats.funnel}
              height={170}
            />
          </CardBody>
        </Card>
      </div>

      <form action="/portal/admin/leads" className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input type="hidden" name="view" value={view} />
        <Input
          type="search"
          name="q"
          defaultValue={filter.q}
          placeholder="Search leads"
          aria-label="Search leads"
          className="col-span-2 sm:w-56"
        />
        {view === "table" ? (
          <Select name="status" defaultValue={filter.status} aria-label="Status" className="sm:w-40">
            <option value="">Any status</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        ) : null}
        <Select name="country" defaultValue={filter.country} aria-label="Country" className="sm:w-36">
          <option value="">Any country</option>
          {COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select name="service" defaultValue={filter.service} aria-label="Service" className="sm:w-52">
          <option value="">Any service</option>
          {LEAD_SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select name="owner" defaultValue={filter.owner} aria-label="Owner" className="sm:w-40">
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {active.length ? (
          <Button asChild variant="ghost">
            <Link href={`/portal/admin/leads?view=${view}`}>Clear</Link>
          </Button>
        ) : null}
      </form>

      {leads.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={active.length ? "No leads match your filters" : "No leads yet"}
            description={
              active.length
                ? "Clear a filter and try again."
                : "Website enquiries appear here the moment they are sent."
            }
          />
        </Card>
      ) : view === "board" ? (
        <LeadBoard leads={leads} canManage={user.permissions.has("leads.manage")} />
      ) : (
        <Card>
          <Table label="Leads">
            <thead>
              <tr>
                {["Lead", "Received", "Country", "Service", "Source", "Owner", "Follow-up", "Status"].map(
                  (h) => (
                    <Th key={h}>{h}</Th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="relative hover:bg-surface-2/60">
                  <Td className="min-w-48">
                    <Link
                      href={`/portal/admin/leads/${l.id}`}
                      className="font-medium after:absolute after:inset-0"
                    >
                      {l.fullName}
                    </Link>{" "}
                    {l.status === "NEW" ? <Badge tone="brand">New</Badge> : null}
                    <span className="block text-xs text-muted">{l.company ?? l.email}</span>
                  </Td>
                  <Td className="tabular text-xs whitespace-nowrap text-muted">
                    {formatDateTime(l.createdAt, company.timezone)}
                  </Td>
                  <Td>{l.country}</Td>
                  <Td className="max-w-56">
                    <span className="line-clamp-2">{l.services.join(", ")}</span>
                  </Td>
                  <Td className="text-xs text-muted">{l.sourcePage ?? "-"}</Td>
                  <Td className="whitespace-nowrap">{l.owner?.name ?? "-"}</Td>
                  <Td className="whitespace-nowrap">{formatISODate(l.followUpDate, "d MMM")}</Td>
                  <Td>
                    <LeadStatusBadge status={l.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
