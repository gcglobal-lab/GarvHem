import type { Metadata } from "next";
import { Download, Users } from "lucide-react";
import Link from "next/link";
import { Rows } from "@/components/portal/charts";
import { LiveBoard } from "@/components/portal/live-board";
import { MonthNav } from "@/components/portal/month-nav";
import { PageHeader } from "@/components/portal/page-header";
import { DAY_STATUS } from "@/components/portal/status";
import { TimesheetTable } from "@/components/portal/timesheet-table";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, Table } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { formatISODate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { timesheetFilterSchema } from "@/lib/validators/attendance";
import { liveBoard, monthMatrix, summarise, timesheet } from "@/server/attendance";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Timesheets" };

export default async function AdminAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("team.attendance.view");
  const p = await flatParams(searchParams);
  const view = p.view === "month" ? "month" : "table";
  const filter = timesheetFilterSchema.parse(p);
  const [{ company }, board, sheet, matrix] = await Promise.all([
    getSettings(),
    liveBoard(user),
    view === "table" ? timesheet(user, filter) : null,
    view === "month" ? monthMatrix(user, p.month ?? "") : null,
  ]);
  const today = sheet?.today ?? matrix?.today ?? "";
  const query = new URLSearchParams(
    sheet ? { employee: filter.employee, from: sheet.from, to: sheet.to, status: filter.status } : {},
  );

  return (
    <>
      <PageHeader title="Timesheets" description="Who came when, lunch taken, overruns and late arrivals." />
      <Card className="mb-5">
        <CardHeader title="Who's in today" description="Updates every 30 seconds" />
        <CardBody>
          <LiveBoard initial={board} today={today} />
        </CardBody>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          label="Timesheet view"
          items={[
            { href: "/portal/admin/attendance", label: "Timesheet", active: view === "table" },
            { href: "/portal/admin/attendance?view=month", label: "Month", active: view === "month" },
          ]}
        />
        {sheet ? (
          <Button asChild variant="outline">
            <a href={`/api/portal/admin/export/attendance?${query}`}>
              <Download aria-hidden /> Export CSV
            </a>
          </Button>
        ) : (
          matrix && (
            <MonthNav month={matrix.month} href={(m) => `/portal/admin/attendance?view=month&month=${m}`} />
          )
        )}
      </div>

      {sheet ? (
        <>
          <form
            action="/portal/admin/attendance"
            className="mb-4 grid grid-cols-2 items-end gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
          >
            <Field label="Employee" className="col-span-2 lg:col-span-1">
              <Select name="employee" defaultValue={filter.employee}>
                <option value="">Everyone</option>
                {sheet.team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <Input type="date" name="from" defaultValue={sheet.from} max={today} />
            </Field>
            <Field label="To">
              <Input type="date" name="to" defaultValue={sheet.to} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={filter.status}>
                <option value="">All</option>
                {Object.entries(DAY_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
                <option value="LATE">Late arrivals</option>
                <option value="OVERRUN">Lunch overruns</option>
                <option value="REVIEW">Needs review</option>
              </Select>
            </Field>
            <Button type="submit">Apply</Button>
          </form>
          <Card>
            <TimesheetTable rows={sheet.rows} timezone={company.timezone} />
          </Card>
          {sheet.rows.some((r) => r.firstIn) ? <Summary data={summarise(sheet.rows)} /> : null}
        </>
      ) : null}

      {matrix ? (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {matrix.people.length ? (
              <Table label="Monthly matrix" className="text-xs">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 min-w-40 border-b border-border bg-surface px-4 py-3 text-left font-medium text-muted"
                    >
                      Employee
                    </th>
                    {matrix.dates.map((d) => (
                      <th
                        key={d}
                        scope="col"
                        className={cn(
                          "border-b border-border px-0.5 py-2 text-center font-medium text-muted",
                          d === matrix.today && "text-foreground",
                        )}
                      >
                        <span className="block text-[10px]">{formatISODate(d, "EEEEE")}</span>
                        {Number(d.slice(8))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.people.map((person) => (
                    <tr key={person.id}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-border/70 bg-surface px-4 py-2 text-left text-sm font-medium whitespace-nowrap"
                      >
                        {person.name}
                      </th>
                      {person.rows.map((r) => {
                        const s = r.status ? DAY_STATUS[r.status] : null;
                        const label = `${person.name}, ${formatISODate(r.date, "d MMM")}: ${s?.label ?? "no record"}${r.isLate ? ", late" : ""}${r.overrunMinutes ? ", lunch overrun" : ""}`;
                        return (
                          <td key={r.date} className="border-b border-border/70 p-0.5">
                            <Link
                              href={`/portal/admin/attendance/${person.id}/${r.date}`}
                              aria-label={label}
                              title={label}
                              className={cn(
                                "relative grid size-8 place-items-center rounded-lg font-semibold",
                                s?.cell ?? "hover:bg-surface-2",
                              )}
                            >
                              <span aria-hidden>{s?.short ?? ""}</span>
                              {r.overrunMinutes > 0 || r.needsReview ? (
                                <span
                                  className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-danger"
                                  aria-hidden
                                />
                              ) : null}
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState icon={Users} title="No one in your team yet" />
            )}
            <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-4 text-xs text-muted">
              {Object.values(DAY_STATUS).map((s) => (
                <li key={s.label} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-md text-[10px] font-semibold",
                      s.cell,
                    )}
                    aria-hidden
                  >
                    {s.short}
                  </span>
                  {s.label}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-danger" aria-hidden /> Overrun or needs review
              </li>
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}

function Summary({ data }: { data: ReturnType<typeof summarise> }) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <Card>
        <CardHeader title="Average hours per day" />
        <CardBody>
          <Rows
            label="Average net hours per worked day"
            xKey="name"
            unit="h"
            series={[{ key: "averageHours", label: "Hours", color: 1 }]}
            data={data}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Late arrivals" />
        <CardBody>
          <Rows
            label="Late arrivals per employee"
            xKey="name"
            series={[{ key: "late", label: "Late days", color: 4 }]}
            data={data}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Lunch overruns" />
        <CardBody>
          <Rows
            label="Lunch overruns per employee"
            xKey="name"
            series={[{ key: "overrun", label: "Overrun days", color: 2 }]}
            data={data}
          />
        </CardBody>
      </Card>
    </div>
  );
}
