import type { Metadata } from "next";
import {
  AlarmClock,
  CalendarOff,
  ClipboardList,
  FileWarning,
  Inbox,
  ListTodo,
  UserCheck,
  UserX,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { Columns, Lines, Rows } from "@/components/portal/charts";
import { PageHeader, Stat } from "@/components/portal/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { formatISODate, timeAgo } from "@/lib/time";
import { activityFeed, adminOverview, leadsByWeek } from "@/server/dashboard";
import { leadStats } from "@/server/leads";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const user = await requirePagePermission("team.attendance.view");
  const seesLeads = user.permissions.has("leads.view");
  const [o, feed, leads, weeks] = await Promise.all([
    adminOverview(user),
    activityFeed(user),
    seesLeads ? leadStats() : Promise.resolve(null),
    seesLeads ? leadsByWeek() : Promise.resolve([]),
  ]);
  const k = o.kpis;
  const newLeads = leads?.byStatus.find((s) => s.status === "NEW")?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${formatISODate(o.today, "EEEE, d MMMM yyyy")}, ${k.headcount} people`}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Present today"
          value={k.present}
          icon={UserCheck}
          tone="success"
          href="/portal/admin/attendance"
        />
        <Stat
          label="On lunch"
          value={k.onLunch}
          icon={Utensils}
          tone="warning"
          href="/portal/admin/attendance"
        />
        <Stat label="Not in" value={k.absent} icon={UserX} tone="danger" href="/portal/admin/attendance" />
        <Stat
          label="On leave"
          value={k.onLeave}
          icon={CalendarOff}
          tone="accent"
          href="/portal/admin/leaves?view=calendar"
        />
        <Stat
          label="Pending leave requests"
          value={k.pendingLeaves}
          icon={ClipboardList}
          tone={k.pendingLeaves ? "warning" : "neutral"}
          href="/portal/admin/leaves"
        />
        <Stat
          label="Missing reports today"
          value={k.missingReports}
          icon={FileWarning}
          tone={k.missingReports ? "warning" : "neutral"}
          href="/portal/admin/reports"
        />
        <Stat
          label="Overdue tasks"
          value={k.overdueTasks}
          icon={AlarmClock}
          tone={k.overdueTasks ? "danger" : "neutral"}
          href="/portal/tasks?view=list&overdue=1"
        />
        {leads ? (
          <Stat
            label="New leads"
            value={newLeads}
            hint={`${leads.newThisWeek} received this week`}
            icon={Inbox}
            tone={newLeads ? "danger" : "neutral"}
            href="/portal/admin/leads"
          />
        ) : (
          <Stat
            label="Open tasks"
            value={o.taskStatus.filter((t) => t.status !== "DONE").reduce((s, t) => s + t.count, 0)}
            icon={ListTodo}
            href="/portal/tasks"
          />
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Attendance trend" description="People per working day, last 30 days" />
            <CardBody>
              <Columns
                label="Attendance per working day over the last 30 days"
                xKey="label"
                series={[
                  { key: "present", label: "Present", color: 1 },
                  { key: "absent", label: "Absent", color: 2 },
                  { key: "onLeave", label: "On leave", color: 3 },
                ]}
                data={o.attendanceTrend.map((d) => ({
                  label: d.label,
                  present: d.present,
                  absent: d.absent,
                  onLeave: d.onLeave,
                }))}
                height={260}
              />
            </CardBody>
          </Card>
          {leads ? (
            <Card>
              <CardHeader title="Leads by week" description="Website enquiries received" />
              <CardBody>
                <Lines
                  label="Leads received per week"
                  xKey="label"
                  series={[{ key: "leads", label: "Leads", color: 2 }]}
                  data={weeks.map((w) => ({ label: w.label, leads: w.leads }))}
                />
              </CardBody>
            </Card>
          ) : null}
          {leads ? (
            <Card>
              <CardHeader title="Conversion funnel" description={`${leads.total} leads in total`} />
              <CardBody>
                <Rows
                  label="Leads that reached each stage"
                  xKey="stage"
                  series={[{ key: "count", label: "Leads", color: 3 }]}
                  data={leads.funnel}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Hours by employee" description="Net hours, last 30 days" />
            <CardBody>
              <Rows
                label="Net hours by employee over the last 30 days"
                xKey="name"
                unit="h"
                series={[{ key: "hours", label: "Hours", color: 1 }]}
                data={o.hoursByEmployee}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tasks by status" />
            <CardBody>
              <Rows
                label="Tasks by status"
                xKey="label"
                series={[{ key: "count", label: "Tasks", color: 1 }]}
                data={o.taskStatus.map((t) => ({ label: t.label, count: t.count }))}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Recent activity" />
            <CardBody>
              {feed.length ? (
                <ul className="divide-y divide-border">
                  {feed.map((f) => (
                    <li key={f.id}>
                      <Link href={f.href} className="flex items-start gap-3 py-2.5 hover:text-accent">
                        <Avatar name={f.who} className="size-7 text-[11px]" />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-medium">{f.who}</span>{" "}
                          <span className="text-muted">{f.text}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">{timeAgo(f.at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={ListTodo}
                  title="Nothing yet"
                  description="Activity appears here as people work."
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
