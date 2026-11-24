import type { Metadata } from "next";
import { AlarmClock, CalendarCheck, Clock, UtensilsCrossed } from "lucide-react";
import { AttendanceCalendar } from "@/components/portal/attendance-calendar";
import { AttendanceCard } from "@/components/portal/attendance-card";
import { MonthNav } from "@/components/portal/month-nav";
import { PageHeader, Stat } from "@/components/portal/page-header";
import { DAY_STATUS, DayStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { formatISODate, formatMinutes, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { todayState, userMonth } from "@/server/attendance";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("own.attendance");
  const p = await flatParams(searchParams);
  const [{ company }, month, state] = await Promise.all([
    getSettings(),
    userMonth(user.id, p.month ?? ""),
    todayState(user.id),
  ]);
  const tz = company.timezone;
  const view = p.view === "table" ? "table" : "calendar";
  const status =
    p.status && p.status in DAY_STATUS
      ? p.status
      : p.status === "LATE" || p.status === "OVERRUN"
        ? p.status
        : "";
  const rows = month.rows
    .filter((r) => r.status !== null)
    .filter((r) =>
      !status
        ? true
        : status === "LATE"
          ? r.isLate
          : status === "OVERRUN"
            ? r.overrunMinutes > 0
            : r.status === status,
    )
    .reverse();
  const link = (o: Record<string, string>) =>
    `/portal/attendance?${new URLSearchParams({ month: month.month, view, ...(status ? { status } : {}), ...o })}`;

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`Times are shown in ${tz === "Asia/Kolkata" ? "IST" : tz}.`}
        actions={<MonthNav month={month.month} href={(m) => link({ month: m })} />}
      />
      <div className="space-y-5">
        <AttendanceCard initial={state} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Days present"
            value={month.totals.present}
            hint={`${month.totals.halfDay} half, ${month.totals.absent} absent, ${month.totals.onLeave} on leave`}
            icon={CalendarCheck}
            tone="success"
          />
          <Stat
            label="Net hours"
            value={formatMinutes(month.totals.netMinutes)}
            hint={`${formatMinutes(month.totals.averageMinutes)} per day on average`}
            icon={Clock}
            tone="accent"
          />
          <Stat label="Late arrivals" value={month.totals.late} icon={AlarmClock} tone="warning" />
          <Stat
            label="Lunch overrun"
            value={formatMinutes(month.totals.overrunMinutes)}
            icon={UtensilsCrossed}
            tone="danger"
          />
        </div>

        <Card>
          <CardHeader
            title="History"
            action={
              <LinkTabs
                label="Attendance view"
                items={[
                  { href: link({ view: "calendar" }), label: "Calendar", active: view === "calendar" },
                  { href: link({ view: "table" }), label: "Table", active: view === "table" },
                ]}
              />
            }
          />
          <CardBody>
            {view === "calendar" ? (
              <AttendanceCalendar rows={month.rows} today={month.today} timezone={tz} />
            ) : (
              <>
                <form className="mb-4 flex flex-wrap gap-2" action="/portal/attendance">
                  <input type="hidden" name="month" value={month.month} />
                  <input type="hidden" name="view" value="table" />
                  <Select name="status" defaultValue={status} aria-label="Filter by status" className="w-48">
                    <option value="">All statuses</option>
                    {Object.entries(DAY_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                    <option value="LATE">Late arrivals</option>
                    <option value="OVERRUN">Lunch overruns</option>
                  </Select>
                  <Button type="submit" variant="outline">
                    Filter
                  </Button>
                </form>
                {rows.length ? (
                  <Table label="Attendance history">
                    <thead>
                      <tr>
                        {["Date", "Status", "In", "Out", "Lunch", "Net hours", "Flags"].map((h) => (
                          <Th key={h}>{h}</Th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {rows.map((r) => (
                        <tr key={r.date}>
                          <Td className="font-medium whitespace-nowrap">
                            {formatISODate(r.date, "EEE, d MMM")}
                          </Td>
                          <Td>
                            <DayStatusBadge status={r.status} />
                          </Td>
                          <Td className="whitespace-nowrap">{formatTime(r.firstIn, tz)}</Td>
                          <Td className="whitespace-nowrap">
                            {r.isOpen ? "Working" : formatTime(r.lastOut, tz)}
                          </Td>
                          <Td className={cn(r.overrunMinutes > 0 && "font-semibold text-danger")}>
                            {r.firstIn ? `${r.lunchMinutes}m` : "-"}
                          </Td>
                          <Td>{r.firstIn ? formatMinutes(r.netMinutes) : "-"}</Td>
                          <Td>
                            <span className="flex flex-wrap gap-1">
                              {r.isLate ? <Badge tone="warning">Late {r.lateMinutes}m</Badge> : null}
                              {r.overrunMinutes > 0 ? (
                                <Badge tone="danger">Lunch +{r.overrunMinutes}m</Badge>
                              ) : null}
                              {r.isEarlyLeave ? <Badge>Left early</Badge> : null}
                              {r.autoClosed ? <Badge tone="danger">Auto closed</Badge> : null}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No records match"
                    description="Try another month or status."
                  />
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
