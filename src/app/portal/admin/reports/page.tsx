import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Download, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { addDaysISO, formatISODate, formatTime } from "@/lib/time";
import { reportFilterSchema } from "@/lib/validators/reports";
import { reportBoard } from "@/server/reports";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Daily reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("reports.viewAll");
  const filter = reportFilterSchema.parse(await flatParams(searchParams));
  const [{ company }, board] = await Promise.all([getSettings(), reportBoard(user, filter)]);
  const day = (d: string) =>
    `/portal/admin/reports?${new URLSearchParams({ date: d, employee: filter.employee })}`;
  const waiting = board.missing.filter((m) => !m.onLeave);

  return (
    <>
      <PageHeader
        title="Daily reports"
        description={formatISODate(board.date, "EEEE, d MMMM yyyy")}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={day(addDaysISO(board.date, -1))}>Previous day</Link>
            </Button>
            {board.date < board.today ? (
              <Button asChild variant="outline" size="sm">
                <Link href={day(addDaysISO(board.date, 1))}>Next day</Link>
              </Button>
            ) : null}
          </>
        }
      />
      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <form action="/portal/admin/reports" className="flex flex-wrap items-end gap-3">
          <Field label="Date" className="w-44">
            <Input type="date" name="date" defaultValue={board.date} max={board.today} key={board.date} />
          </Field>
          <Field label="Employee" className="w-48">
            <Select name="employee" defaultValue={filter.employee}>
              <option value="">Everyone</option>
              {board.team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Show</Button>
        </form>
        <form
          action="/api/portal/admin/export/reports"
          className="flex flex-wrap items-end gap-3 xl:justify-end"
        >
          <input type="hidden" name="employee" value={filter.employee} />
          <Field label="Export from" className="w-40">
            <Input type="date" name="from" defaultValue={board.date} max={board.today} />
          </Field>
          <Field label="to" className="w-40">
            <Input type="date" name="to" defaultValue={board.date} max={board.today} />
          </Field>
          <Button type="submit" variant="outline">
            <Download aria-hidden /> CSV
          </Button>
        </form>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title="Submitted" action={<Badge tone="success">{board.submitted.length}</Badge>} />
          <CardBody>
            {board.submitted.length ? (
              <ul className="divide-y divide-border">
                {board.submitted.map((r) => (
                  <li key={r.id}>
                    <Link href={`/portal/reports/${r.id}`} className="flex gap-3 py-4 hover:text-accent">
                      <Avatar name={r.user.name} className="size-9" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{r.user.name}</span>
                          <span className="text-xs text-muted">
                            {formatTime(r.createdAt, company.timezone)}
                          </span>
                          {r.blockers ? (
                            <Badge tone="warning">
                              <AlertTriangle aria-hidden /> Blocker
                            </Badge>
                          ) : null}
                          {r.comments.length ? (
                            <Badge>
                              <MessageSquare aria-hidden /> {r.comments.length}
                              <span className="sr-only"> comments</span>
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm text-muted">{r.summary}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileText} title="No reports for this day" />
            )}
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader
            title="Missing"
            description={board.isWorkingDay ? undefined : "This is a weekend or holiday."}
            action={
              board.isWorkingDay ? (
                <Badge tone={waiting.length ? "danger" : "success"}>{waiting.length}</Badge>
              ) : null
            }
          />
          <CardBody>
            {board.missing.length ? (
              <ul className="space-y-3">
                {board.missing.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.name} />
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {m.name}
                      <span className="block text-xs font-normal text-muted">{m.designation}</span>
                    </span>
                    {m.onLeave ? (
                      <Badge tone="accent">On leave</Badge>
                    ) : board.isWorkingDay ? (
                      <Badge tone="danger">Missing</Badge>
                    ) : (
                      <Badge>Day off</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="Everyone has reported" className="py-6" />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
