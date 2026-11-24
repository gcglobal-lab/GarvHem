import type { Metadata } from "next";
import { AlarmClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Rows } from "@/components/portal/charts";
import { PageHeader } from "@/components/portal/page-header";
import { PriorityBadge, TaskStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { formatISODate } from "@/lib/time";
import { listTasks, workload } from "@/server/tasks";

export const metadata: Metadata = { title: "Workload" };

export default async function WorkloadPage() {
  const user = await requirePagePermission("tasks.assign");
  const [load, tasks] = await Promise.all([workload(user), listTasks(user)]);
  const overdue = tasks.filter((t) => t.overdue);
  const active = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
  return (
    <>
      <PageHeader
        title="Workload"
        description="Who is working on what, and what is late."
        actions={
          <Button asChild variant="outline">
            <Link href="/portal/tasks">Open task board</Link>
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Open tasks per person" />
          <CardBody>
            <Rows
              label="Open tasks per person by status"
              xKey="name"
              series={[
                { key: "todo", label: "To do", color: 1 },
                { key: "inReview", label: "In review", color: 4 },
                { key: "inProgress", label: "In progress", color: 3 },
              ]}
              data={load.map((l) => ({
                name: l.name,
                todo: l.todo,
                inReview: l.inReview,
                inProgress: l.inProgress,
              }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Overdue"
            action={overdue.length ? <Badge tone="danger">{overdue.length}</Badge> : null}
          />
          <CardBody>
            {overdue.length ? (
              <ul className="divide-y divide-border">
                {overdue.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/portal/tasks/${t.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:text-accent"
                    >
                      <AlarmClock className="size-4 text-danger" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                      <span className="text-xs text-muted">
                        {t.assignees.map((a) => a.name).join(", ") || "Unassigned"}
                      </span>
                      <span className="text-xs font-semibold text-danger">
                        {formatISODate(t.dueDate, "d MMM")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="Nothing is overdue" />
            )}
          </CardBody>
        </Card>
      </div>
      <h2 className="mt-8 mb-3 text-lg font-semibold">Who is working on what</h2>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {load.map((p) => {
          const mine = active.filter((t) => t.assignees.some((a) => a.id === p.id));
          return (
            <li key={p.id}>
              <Card className="h-full">
                <CardBody>
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar name={p.name} className="size-9" />
                    <p className="flex-1 truncate text-sm font-semibold">{p.name}</p>
                    {p.overdue ? <Badge tone="danger">{p.overdue} overdue</Badge> : null}
                  </div>
                  {mine.length ? (
                    <ul className="space-y-2">
                      {mine.map((t) => (
                        <li key={t.id}>
                          <Link
                            href={`/portal/tasks/${t.id}`}
                            className="flex items-center gap-2 text-sm hover:text-accent"
                          >
                            <span className="min-w-0 flex-1 truncate">{t.title}</span>
                            <PriorityBadge priority={t.priority} />
                            <TaskStatusBadge status={t.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      {p.todo ? `Nothing in progress, ${p.todo} waiting to start.` : "No open tasks."}
                    </p>
                  )}
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
