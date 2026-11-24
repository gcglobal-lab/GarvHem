import { CheckCircle2, FileWarning, Megaphone, PartyPopper, Pin, Users } from "lucide-react";
import Link from "next/link";
import { AttendanceCard } from "@/components/portal/attendance-card";
import { Columns } from "@/components/portal/charts";
import { LeaveBalances } from "@/components/portal/leave-balances";
import { PageHeader } from "@/components/portal/page-header";
import { PriorityBadge, TASK_STATUS } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { requirePageUser } from "@/lib/auth/guards";
import { addDaysISO, formatISODate, timeAgo, weekStart, workDateOf } from "@/lib/time";
import { cn } from "@/lib/utils";
import { TASK_STATUSES } from "@/lib/validators/tasks";
import { dailyHours, liveBoard, todayState } from "@/server/attendance";
import { listAnnouncements, upcomingHolidays } from "@/server/company";
import { currentYear, userBalances } from "@/server/leaves";
import { getSettings } from "@/server/settings";
import { userTaskSummary } from "@/server/tasks";
import { formatInTimeZone } from "date-fns-tz";

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const { company } = await getSettings();
  const now = new Date();
  const tz = company.timezone;
  const today = workDateOf(now, tz);
  const monday = weekStart(today);
  const canSeeTeam = user.permissions.has("team.attendance.view");
  const [state, balances, tasks, week, holidays, announcements, board] = await Promise.all([
    todayState(user.id, now),
    userBalances(user.id, await currentYear()),
    userTaskSummary(user.id),
    dailyHours(user.id, monday, addDaysISO(monday, 6), now),
    upcomingHolidays(4),
    listAnnouncements({ activeOnly: true, take: 4 }),
    canSeeTeam ? liveBoard(user, now) : Promise.resolve(null),
  ]);
  const inNow = board?.filter((b) => b.status === "WORKING" || b.status === "ON_LUNCH").length ?? 0;

  return (
    <>
      <PageHeader
        title={`${greeting(Number(formatInTimeZone(now, tz, "H")))}, ${user.name.split(" ")[0]}`}
        description={formatISODate(today, "EEEE, d MMMM yyyy")}
        actions={
          board ? (
            <Button asChild variant="outline">
              <Link href="/portal/admin">
                <Users aria-hidden /> {inNow} of {board.length} in now
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <AttendanceCard initial={state} />

          <Link
            href="/portal/daily-report"
            className={cn(
              "flex items-center gap-4 rounded-card border p-4 transition-shadow hover:shadow-soft",
              state.reportSubmitted ? "border-border bg-surface" : "border-warning/30 bg-warning-soft",
            )}
          >
            {state.reportSubmitted ? (
              <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />
            ) : (
              <FileWarning className="size-6 shrink-0 text-warning" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {state.reportSubmitted ? "Daily report: Submitted ✓" : "Submit today's report"}
              </span>
              <span
                className={cn("block text-[13px]", state.reportSubmitted ? "text-muted" : "text-warning")}
              >
                {state.reportSubmitted
                  ? "You can still edit it until the cutoff."
                  : "Two minutes: what you did, any blockers, and tomorrow's plan."}
              </span>
            </span>
          </Link>

          <Card>
            <CardHeader title="This week" description="Hours worked per day" />
            <CardBody>
              <Columns
                label="Hours worked per day this week"
                xKey="day"
                unit="h"
                series={[{ key: "hours", label: "Hours", color: 1 }]}
                data={week.map((d) => ({
                  day: formatISODate(d.date, "EEE"),
                  hours: Math.round(d.minutes / 6) / 10,
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="My tasks"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/portal/tasks">Open board</Link>
                </Button>
              }
            />
            <CardBody>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TASK_STATUSES.map((s) => (
                  <li key={s} className="rounded-xl bg-surface-2 px-3 py-2.5">
                    <span className="tabular block font-display text-xl font-semibold">
                      {tasks.counts[s]}
                    </span>
                    <span className="text-xs text-muted">{TASK_STATUS[s].label}</span>
                  </li>
                ))}
              </ul>
              {tasks.next.length ? (
                <ul className="mt-4 divide-y divide-border">
                  {tasks.next.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/portal/tasks/${t.id}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:text-accent"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                        <PriorityBadge priority={t.priority} />
                        {t.dueDate ? (
                          <span
                            className={cn("text-xs", t.overdue ? "font-semibold text-danger" : "text-muted")}
                          >
                            {t.overdue ? "Overdue, " : "Due "}
                            {formatISODate(t.dueDate, "d MMM")}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nothing waiting for you"
                  description="New tasks will show up here."
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader
              title="Leave balance"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/portal/leaves">Apply</Link>
                </Button>
              }
            />
            <CardBody className="[&_ul]:xl:grid-cols-1 [&_ul]:2xl:grid-cols-2">
              <LeaveBalances balances={balances} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Announcements" />
            <CardBody>
              {announcements.length ? (
                <ul className="space-y-4">
                  {announcements.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:text-danger">
                        {a.pinned ? (
                          <Pin className="size-4" aria-label="Pinned" />
                        ) : (
                          <Megaphone className="size-4" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="mt-0.5 text-sm whitespace-pre-line text-muted">{a.body}</p>
                        <p className="mt-1 text-xs text-muted">
                          {a.author}, {timeAgo(a.createdAt, now)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Megaphone} title="No announcements" className="py-6" />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Upcoming holidays" />
            <CardBody>
              {holidays.length ? (
                <ul className="space-y-3">
                  {holidays.map((h) => (
                    <li key={h.id} className="flex items-center gap-3">
                      <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-surface-2 py-1.5 text-center">
                        <span className="text-[11px] text-muted">{formatISODate(h.date, "MMM")}</span>
                        <span className="tabular font-display text-lg leading-5 font-semibold">
                          {formatISODate(h.date, "d")}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium">
                        {h.name}
                        <span className="block text-xs font-normal text-muted">
                          {formatISODate(h.date, "EEEE")}
                        </span>
                      </span>
                      {h.isOptional ? <Badge>Optional</Badge> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={PartyPopper} title="No holidays listed yet" className="py-6" />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
