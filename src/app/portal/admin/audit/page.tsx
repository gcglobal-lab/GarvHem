import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { formatDateTime } from "@/lib/time";
import { describeUserAgent } from "@/lib/user-agent";
import { page as pageSchema } from "@/lib/validators/common";
import { auditEntries } from "@/server/audit-log";
import { teamMembers } from "@/server/scope";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Audit log" };

const tone = (action: string): BadgeTone =>
  /failed|lockout|reuse|delete|deactivate|reject/.test(action)
    ? "danger"
    : /create|approve|login$|reactivate/.test(action)
      ? "success"
      : /reset|correct|adjust|role|permission|update/.test(action)
        ? "warning"
        : "neutral";

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("audit.view");
  const p = await flatParams(searchParams);
  const f = {
    action: (p.action ?? "").slice(0, 60),
    actor: (p.actor ?? "").slice(0, 40),
    from: (p.from ?? "").slice(0, 10),
    to: (p.to ?? "").slice(0, 10),
    page: pageSchema.parse(p.page ?? 1),
  };
  const [{ company }, log, people] = await Promise.all([
    getSettings(),
    auditEntries(f),
    teamMembers(user, { includeInactive: true }),
  ]);
  const areas = [...new Set(log.actions.map((a) => a.split(".")[0]!))];
  const pageLink = (n: number) =>
    `/portal/admin/audit?${new URLSearchParams({ action: f.action, actor: f.actor, from: f.from, to: f.to, page: String(n) })}`;

  return (
    <>
      <PageHeader
        title="Audit log"
        description={`${log.total.toLocaleString("en")} entries. Nothing here can be edited.`}
      />
      <form
        action="/portal/admin/audit"
        className="mb-5 grid grid-cols-2 items-end gap-3 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto_auto]"
      >
        <Field label="Action">
          <Select name="action" defaultValue={f.action}>
            <option value="">All actions</option>
            {areas.map((a) => (
              <option key={a} value={`${a}.*`}>
                {a} (all)
              </option>
            ))}
            {log.actions.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="Person">
          <Select name="actor" defaultValue={f.actor}>
            <option value="">Anyone</option>
            {people.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" name="from" defaultValue={f.from} />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={f.to} />
        </Field>
        <Button type="submit">Apply</Button>
        <Button asChild variant="ghost">
          <Link href="/portal/admin/audit">Clear</Link>
        </Button>
      </form>
      <Card>
        {log.rows.length ? (
          <Table label="Audit log">
            <thead>
              <tr>
                {["When", "Action", "By", "Target", "IP and device", "Details"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.rows.map((r) => (
                <tr key={r.id}>
                  <Td className="tabular align-top text-xs whitespace-nowrap">
                    {formatDateTime(r.createdAt, company.timezone)}
                  </Td>
                  <Td className="align-top">
                    <Badge tone={tone(r.action)}>{r.action}</Badge>
                  </Td>
                  <Td className="align-top whitespace-nowrap">{r.actor}</Td>
                  <Td className="align-top text-xs text-muted">
                    {r.targetType ?? "-"}
                    <span className="block max-w-36 truncate" title={r.targetId ?? undefined}>
                      {r.targetId}
                    </span>
                  </Td>
                  <Td className="align-top text-xs whitespace-nowrap text-muted">
                    {r.ip ?? "-"}
                    <span className="block">{r.userAgent ? describeUserAgent(r.userAgent) : ""}</span>
                  </Td>
                  <Td className="min-w-64 align-top">
                    {r.before || r.after ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-accent">Before and after</summary>
                        <div className="mt-2 grid gap-2 xl:grid-cols-2">
                          {(
                            [
                              ["Before", r.before],
                              ["After", r.after],
                            ] as const
                          ).map(([label, value]) =>
                            value ? (
                              <div key={label}>
                                <p className="mb-1 font-medium">{label}</p>
                                <pre className="max-h-64 scrollbar-thin overflow-auto rounded-lg bg-surface-2 p-2.5 text-[11px] whitespace-pre-wrap">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            ) : null,
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={ScrollText} title="No entries match" />
        )}
      </Card>
      {log.pages > 1 ? (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {f.page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageLink(f.page - 1)}>Newer</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {Math.min(f.page, log.pages)} of {log.pages}
          </span>
          {f.page < log.pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageLink(f.page + 1)}>Older</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
