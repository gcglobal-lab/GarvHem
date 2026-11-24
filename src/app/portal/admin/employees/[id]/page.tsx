import type { Metadata } from "next";
import { ArrowLeft, FileText, ListTodo, Pencil } from "lucide-react";
import Link from "next/link";
import { AttendanceCalendar } from "@/components/portal/attendance-calendar";
import { AdjustBalance } from "@/components/portal/leave-admin";
import { LeaveBalances } from "@/components/portal/leave-balances";
import { LedgerTable } from "@/components/portal/ledger-table";
import { MonthNav } from "@/components/portal/month-nav";
import { Stat } from "@/components/portal/page-header";
import { TaskStatusBadge } from "@/components/portal/status";
import { EditUserButton, UserSecurityActions } from "@/components/portal/user-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, orNotFound, type SearchParams } from "@/lib/page";
import { formatDateTime, formatISODate, formatMinutes } from "@/lib/time";
import { userMonth } from "@/server/attendance";
import { currentYear, ledgerFor, listLeaveTypes, userBalances } from "@/server/leaves";
import { reportHistory } from "@/server/reports";
import { assertInTeam, isCompanyWide } from "@/server/scope";
import { getSettings } from "@/server/settings";
import { userTaskSummary } from "@/server/tasks";
import { getUser, listDepartments, listManagers } from "@/server/users";

export const metadata: Metadata = { title: "Employee" };

const ROLE = { ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Employee" } as const;
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default async function EmployeePage({ params, searchParams }: Props) {
  const viewer = await requirePagePermission("team.attendance.view");
  const { id } = await params;
  await orNotFound(assertInTeam(viewer, id));
  const p = await flatParams(searchParams);
  const canManage = viewer.permissions.has("users.manage");
  const canLeaves = viewer.permissions.has("leaves.approve");
  const canReports = viewer.permissions.has("reports.viewAll");
  const canAdjust =
    viewer.permissions.has("leaves.adjustBalance") && (id !== viewer.id || isCompanyWide(viewer));
  const year = await currentYear();
  const [u, { company, attendance }, month, balances, ledger, tasks, reports, types, managers, departments] =
    await Promise.all([
      getUser(id),
      getSettings(),
      userMonth(id, p.month ?? ""),
      canLeaves ? userBalances(id, year) : [],
      canLeaves ? ledgerFor(id, year) : [],
      userTaskSummary(id, 6),
      canReports ? reportHistory(id, 6) : [],
      canAdjust ? listLeaveTypes() : [],
      canManage ? listManagers() : [],
      canManage ? listDepartments() : [],
    ]);
  const shift = { start: attendance.shiftStart, end: attendance.shiftEnd };
  const facts: [string, string][] = [
    ["Email", u.email],
    ["Phone", u.phone ?? "-"],
    ["Department", u.department ?? "-"],
    ["Manager", u.manager?.name ?? "-"],
    ["Joined", formatISODate(u.joiningDate)],
    ["Shift", `${u.shiftStart ?? shift.start} to ${u.shiftEnd ?? shift.end}`],
    ["Last login", u.lastLoginAt ? formatDateTime(u.lastLoginAt, company.timezone) : "Never"],
  ];

  return (
    <>
      <Link
        href={canManage ? "/portal/admin/employees" : "/portal/admin/attendance"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> {canManage ? "Employees" : "Timesheets"}
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={u.name} className="size-16 text-xl" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold sm:text-[28px]">{u.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {u.employeeCode}
              {u.designation ? <span>{u.designation}</span> : null}
              <Badge>{ROLE[u.role]}</Badge>
              <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge>
              {u.mustChangePassword ? <Badge tone="warning">Temporary password</Badge> : null}
              {u.lockedUntil ? <Badge tone="danger">Locked</Badge> : null}
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <EditUserButton
              key={JSON.stringify(u)}
              user={u}
              isSelf={u.id === viewer.id}
              managers={managers}
              departments={departments}
              shift={shift}
              trigger={
                <Button variant="outline">
                  <Pencil aria-hidden /> Edit
                </Button>
              }
            />
            {u.id === viewer.id ? null : <UserSecurityActions user={u} />}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Days present"
              value={month.totals.present}
              hint={`${month.totals.absent} absent this month`}
            />
            <Stat label="Net hours" value={formatMinutes(month.totals.netMinutes)} />
            <Stat label="Late arrivals" value={month.totals.late} />
            <Stat label="Lunch overrun" value={formatMinutes(month.totals.overrunMinutes)} />
          </div>
          <Card>
            <CardHeader
              title="Attendance"
              action={
                <MonthNav month={month.month} href={(m) => `/portal/admin/employees/${id}?month=${m}`} />
              }
            />
            <CardBody>
              <AttendanceCalendar rows={month.rows} today={month.today} timezone={company.timezone} />
            </CardBody>
          </Card>
          {canLeaves ? (
            <Card>
              <CardHeader title={`Leave ledger, ${year}`} />
              <CardBody className="px-0 pb-2">
                <LedgerTable entries={ledger} timezone={company.timezone} />
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-muted">{k}</dt>
                    <dd className="min-w-0 truncate text-right font-medium" title={v}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          {canLeaves ? (
            <Card>
              <CardHeader
                title="Leave balance"
                action={
                  canAdjust ? (
                    <AdjustBalance
                      people={[{ id: u.id, name: u.name }]}
                      userId={u.id}
                      types={types}
                      year={year}
                    />
                  ) : null
                }
              />
              <CardBody className="[&>ul]:sm:grid-cols-2 [&>ul]:xl:grid-cols-1">
                <LeaveBalances balances={balances} />
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Open tasks" />
            <CardBody>
              {tasks.next.length ? (
                <ul className="divide-y divide-border">
                  {tasks.next.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/portal/tasks/${t.id}`}
                        className="flex items-center gap-3 py-2.5 text-sm hover:text-accent"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                        <TaskStatusBadge status={t.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={ListTodo} title="No open tasks" className="py-4" />
              )}
            </CardBody>
          </Card>
          {canReports ? (
            <Card>
              <CardHeader title="Recent reports" />
              <CardBody>
                {reports.length ? (
                  <ul className="divide-y divide-border">
                    {reports.map((r) => (
                      <li key={r.id}>
                        <Link href={`/portal/reports/${r.id}`} className="block py-2.5 hover:text-accent">
                          <span className="text-sm font-medium">
                            {formatISODate(r.workDate, "EEE, d MMM")}
                          </span>
                          <span className="line-clamp-1 block text-[13px] text-muted">{r.summary}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon={FileText} title="No reports yet" className="py-4" />
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
