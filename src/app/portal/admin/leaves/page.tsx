import type { ReactNode } from "react";
import type { Metadata } from "next";
import { CalendarDays, Inbox, Users } from "lucide-react";
import { AdjustBalance, BulkAllocate, DecideLeave } from "@/components/portal/leave-admin";
import { MonthNav } from "@/components/portal/month-nav";
import { PageHeader } from "@/components/portal/page-header";
import { LeaveStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { eachISODate, formatISODate, monthEnd, weekdayOf, workDateOf, yearOf } from "@/lib/time";
import { cn, plural } from "@/lib/utils";
import { listHolidays } from "@/server/company";
import { balancesFor, listLeaveTypes, teamLeaves, type LeaveRow } from "@/server/leaves";
import { isCompanyWide, teamMembers } from "@/server/scope";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Leave management" };

const dates = (r: LeaveRow) =>
  `${formatISODate(r.from, "d MMM")}${r.to !== r.from ? ` to ${formatISODate(r.to, "d MMM yyyy")}` : formatISODate(r.to, " yyyy")}`;

export default async function AdminLeavesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("leaves.approve");
  const p = await flatParams(searchParams);
  const view = p.view === "calendar" || p.view === "balances" || p.view === "history" ? p.view : "inbox";
  const { company, attendance } = await getSettings();
  const today = workDateOf(new Date(), company.timezone);
  const year = yearOf(today);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(p.month ?? "") ? p.month! : today.slice(0, 7);
  const canAdjust = user.permissions.has("leaves.adjustBalance");
  const companyWide = isCompanyWide(user);

  const [pending, people, types] = await Promise.all([
    teamLeaves(user, { status: "PENDING" }),
    teamMembers(user),
    listLeaveTypes(),
  ]);
  const adjustable = people.filter((x) => companyWide || x.id !== user.id);
  const tab = (v: string, label: ReactNode) => ({
    href: v === "inbox" ? "/portal/admin/leaves" : `/portal/admin/leaves?view=${v}`,
    label,
    active: view === v,
  });

  return (
    <>
      <PageHeader
        title="Leave management"
        description="Requests, the team calendar and balances."
        actions={
          <>
            {canAdjust && adjustable.length ? (
              <AdjustBalance people={adjustable} types={types} year={year} />
            ) : null}
            {canAdjust && user.permissions.has("settings.manage") ? <BulkAllocate year={year} /> : null}
          </>
        }
      />
      <LinkTabs
        label="Leave views"
        className="mb-5"
        items={[
          tab("inbox", <>Inbox {pending.length ? <Badge tone="brand">{pending.length}</Badge> : null}</>),
          tab("calendar", "Team calendar"),
          tab("balances", "Balances"),
          tab("history", "History"),
        ]}
      />
      {view === "inbox" ? <InboxView rows={pending} canDecideOwn={companyWide} userId={user.id} /> : null}
      {view === "calendar" ? (
        <CalendarView
          month={month}
          today={today}
          rows={await teamLeaves(user, { from: `${month}-01`, to: monthEnd(`${month}-01`) }, 500)}
          holidays={await listHolidays(yearOf(`${month}-01`))}
          workWeek={attendance.workWeekDays}
          people={people}
        />
      ) : null}
      {view === "balances" ? (
        <Card>
          <CardHeader
            title={`Balances, ${year}`}
            description="Days available now. Pending requests are already subtracted."
          />
          <CardBody className="px-0 pb-2">
            <BalanceTable
              people={people}
              types={types.map((t) => t.name)}
              balances={await balancesFor(
                people.map((x) => x.id),
                year,
              )}
            />
          </CardBody>
        </Card>
      ) : null}
      {view === "history" ? (
        <HistoryView rows={(await teamLeaves(user)).filter((r) => r.status !== "PENDING")} />
      ) : null}
    </>
  );
}

function InboxView({
  rows,
  canDecideOwn,
  userId,
}: {
  rows: LeaveRow[];
  canDecideOwn: boolean;
  userId: string;
}) {
  if (!rows.length)
    return (
      <Card>
        <EmptyState
          icon={Inbox}
          title="The inbox is clear"
          description="New leave requests will land here."
        />
      </Card>
    );
  return (
    <ul className="grid gap-4 xl:grid-cols-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Card className="h-full">
            <CardBody className="flex h-full flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={r.user.name} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.user.name}</p>
                  <p className="text-xs text-muted">{r.user.designation}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: r.type.color }} aria-hidden />
                  {r.type.name}
                </span>
              </div>
              <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
                <span className="font-semibold">{dates(r)}</span>, {plural(r.days, "day")}
                {r.firstHalfDay || r.lastHalfDay ? " (includes a half day)" : ""}
                <span className="mt-1 block text-muted">{r.reason}</span>
              </p>
              <div className="mt-auto flex justify-end">
                {r.user.id !== userId || canDecideOwn ? (
                  <DecideLeave
                    id={r.id}
                    name={r.user.name}
                    summary={`${r.type.name}, ${dates(r)}, ${plural(r.days, "day")}`}
                  />
                ) : (
                  <p className="text-xs text-muted">An administrator decides your own requests.</p>
                )}
              </div>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function CalendarView({
  month,
  today,
  rows,
  holidays,
  workWeek,
  people,
}: {
  month: string;
  today: string;
  rows: LeaveRow[];
  holidays: { date: string; name: string; isOptional: boolean }[];
  workWeek: number[];
  people: { id: string; name: string }[];
}) {
  const days = eachISODate(`${month}-01`, monthEnd(`${month}-01`));
  const shown = rows.filter((r) => r.status === "APPROVED" || r.status === "PENDING");
  return (
    <Card>
      <CardHeader
        title="Team calendar"
        action={<MonthNav month={month} href={(m) => `/portal/admin/leaves?view=calendar&month=${m}`} />}
      />
      <CardBody className="px-0">
        {people.length ? (
          <Table label="Team leave calendar" className="text-xs">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-36 border-b border-border bg-surface px-4 py-2 text-left font-medium text-muted"
                >
                  Employee
                </th>
                {days.map((d) => {
                  const h = holidays.find((x) => x.date === d && !x.isOptional);
                  return (
                    <th
                      key={d}
                      scope="col"
                      title={h?.name}
                      className={cn(
                        "border-b border-border px-0.5 py-2 text-center font-medium",
                        d === today ? "text-foreground" : "text-muted",
                        h && "text-danger",
                      )}
                    >
                      <span className="block text-[10px]">{formatISODate(d, "EEEEE")}</span>
                      {Number(d.slice(8))}
                      {h ? <span className="sr-only"> {h.name}</span> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-border/70 bg-surface px-4 py-2 text-left text-sm font-medium whitespace-nowrap"
                  >
                    {p.name}
                  </th>
                  {days.map((d) => {
                    const off =
                      !workWeek.includes(weekdayOf(d)) || holidays.some((h) => h.date === d && !h.isOptional);
                    const leave = off
                      ? undefined
                      : shown.find((r) => r.user.id === p.id && r.from <= d && r.to >= d);
                    return (
                      <td key={d} className={cn("border-b border-border/70 p-0.5", off && "bg-surface-2/70")}>
                        {leave ? (
                          <span
                            className={cn(
                              "grid size-7 place-items-center rounded-lg text-[10px] font-semibold",
                              leave.status === "PENDING" ? "border border-dashed text-muted" : "text-white",
                            )}
                            style={
                              leave.status === "PENDING"
                                ? { borderColor: leave.type.color }
                                : { background: leave.type.color }
                            }
                            title={`${leave.type.name} (${leave.status.toLowerCase()})`}
                          >
                            <span aria-hidden>{leave.type.name.charAt(0)}</span>
                            <span className="sr-only">
                              {leave.type.name}, {leave.status.toLowerCase()}
                            </span>
                          </span>
                        ) : (
                          <span className="block size-7" />
                        )}
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
        <p className="px-5 pt-4 text-xs text-muted">
          Filled: approved. Dashed: pending. Grey: weekend or holiday.
        </p>
      </CardBody>
    </Card>
  );
}

function BalanceTable({
  people,
  types,
  balances,
}: {
  people: { id: string; name: string; employeeCode: string }[];
  types: string[];
  balances: Awaited<ReturnType<typeof balancesFor>>;
}) {
  if (!people.length) return <EmptyState icon={Users} title="No one in your team yet" />;
  return (
    <Table label="Leave balances">
      <thead>
        <tr>
          <Th>Employee</Th>
          {types.map((t) => (
            <Th key={t} className="text-right">
              {t}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular">
        {people.map((p) => (
          <tr key={p.id}>
            <Td className="font-medium whitespace-nowrap">
              {p.name} <span className="text-xs font-normal text-muted">{p.employeeCode}</span>
            </Td>
            {balances.get(p.id)?.map((b) => (
              <Td key={b.typeId} className="text-right">
                <span className={cn("font-semibold", !b.isUnlimited && b.remaining <= 0 && "text-danger")}>
                  {b.isUnlimited ? `${b.used} used` : b.remaining}
                </span>
                {b.isUnlimited ? null : <span className="text-xs text-muted"> of {b.allotted}</span>}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function HistoryView({ rows }: { rows: LeaveRow[] }) {
  return (
    <Card>
      {rows.length ? (
        <Table label="Decided leave requests">
          <thead>
            <tr>
              {["Employee", "Type", "Dates", "Days", "Status", "Decided by", "Note"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium whitespace-nowrap">{r.user.name}</Td>
                <Td className="whitespace-nowrap">{r.type.name}</Td>
                <Td className="whitespace-nowrap">{dates(r)}</Td>
                <Td className="tabular">{r.days}</Td>
                <Td>
                  <LeaveStatusBadge status={r.status} />
                </Td>
                <Td className="whitespace-nowrap">{r.approver ?? "-"}</Td>
                <Td className="text-muted">{r.decisionNote ?? ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState icon={CalendarDays} title="No decided requests yet" />
      )}
    </Card>
  );
}
