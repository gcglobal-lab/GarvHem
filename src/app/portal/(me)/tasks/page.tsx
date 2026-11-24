import type { Metadata } from "next";
import { KanbanSquare, List, ListTodo, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { PriorityBadge, TASK_PRIORITY, TASK_STATUS, TaskStatusBadge } from "@/components/portal/status";
import { TaskBoard } from "@/components/portal/task-board";
import { TaskEditorButton } from "@/components/portal/task-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { AvatarStack, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { formatISODate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { TASK_PRIORITIES, TASK_STATUSES, taskFilterSchema } from "@/lib/validators/tasks";
import { assignableUsers, listTasks, taskLabels } from "@/server/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("own.tasks");
  const p = await flatParams(searchParams);
  const filter = taskFilterSchema.parse(p);
  const view = p.view === "list" ? "list" : "board";
  const [tasks, people, labels] = await Promise.all([
    listTasks(user, filter),
    assignableUsers(user),
    taskLabels(user),
  ]);
  const canCreate = user.permissions.has("tasks.create");
  const active = Object.entries(filter).filter(([, v]) => v);
  const link = (v: string) => `/portal/tasks?${new URLSearchParams([...active, ["view", v]])}`;

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          canCreate
            ? "Everything in your scope. Drag cards to change their status."
            : "Tasks assigned to you. Drag cards to update their status."
        }
        actions={
          <>
            <LinkTabs
              label="Task view"
              items={[
                {
                  href: link("board"),
                  label: (
                    <>
                      <KanbanSquare aria-hidden /> Board
                    </>
                  ),
                  active: view === "board",
                },
                {
                  href: link("list"),
                  label: (
                    <>
                      <List aria-hidden /> List
                    </>
                  ),
                  active: view === "list",
                },
              ]}
            />
            {canCreate ? (
              <TaskEditorButton
                people={people}
                labels={labels}
                trigger={
                  <Button variant="brand">
                    <Plus aria-hidden /> New task
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />

      <form action="/portal/tasks" className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input type="hidden" name="view" value={view} />
        <Input
          type="search"
          name="q"
          defaultValue={filter.q}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="col-span-2 sm:w-56"
        />
        {people.length ? (
          <Select name="assignee" defaultValue={filter.assignee} aria-label="Assignee" className="sm:w-44">
            <option value="">Everyone</option>
            {people.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        ) : null}
        {view === "list" ? (
          <Select name="status" defaultValue={filter.status} aria-label="Status" className="sm:w-40">
            <option value="">Any status</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS[s].label}
              </option>
            ))}
          </Select>
        ) : null}
        <Select name="priority" defaultValue={filter.priority} aria-label="Priority" className="sm:w-40">
          <option value="">Any priority</option>
          {TASK_PRIORITIES.map((s) => (
            <option key={s} value={s}>
              {TASK_PRIORITY[s].label}
            </option>
          ))}
        </Select>
        {labels.length ? (
          <Select name="label" defaultValue={filter.label} aria-label="Label" className="sm:w-40">
            <option value="">Any label</option>
            {labels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        ) : null}
        <Select name="overdue" defaultValue={filter.overdue} aria-label="Due" className="sm:w-36">
          <option value="">Any due date</option>
          <option value="1">Overdue only</option>
        </Select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {active.length ? (
          <Button asChild variant="ghost">
            <Link href={`/portal/tasks?view=${view}`}>Clear</Link>
          </Button>
        ) : null}
      </form>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTodo}
            title={active.length ? "No tasks match your filters" : "No tasks yet"}
            description={
              active.length
                ? "Clear a filter and try again."
                : canCreate
                  ? "Create the first one."
                  : "Tasks assigned to you will show up here."
            }
          />
        </Card>
      ) : view === "board" ? (
        <TaskBoard tasks={tasks} />
      ) : (
        <Card>
          <Table label="Tasks">
            <thead>
              <tr>
                {["#", "Task", "Status", "Priority", "Assignees", "Due"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={cn(t.overdue && "bg-danger-soft/40")}>
                  <Td className="tabular text-muted">{t.number}</Td>
                  <Td className="min-w-60">
                    <Link href={`/portal/tasks/${t.id}`} className="font-medium hover:text-accent">
                      {t.title}
                    </Link>
                    {t.labels.length || t.client ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {t.client ? <Badge tone="outline">{t.client}</Badge> : null}
                        {t.labels.map((l) => (
                          <Badge key={l}>{l}</Badge>
                        ))}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <TaskStatusBadge status={t.status} />
                  </Td>
                  <Td>
                    <PriorityBadge priority={t.priority} />
                  </Td>
                  <Td>
                    <AvatarStack names={t.assignees.map((a) => a.name)} />
                  </Td>
                  <Td className={cn("whitespace-nowrap", t.overdue && "font-semibold text-danger")}>
                    {t.dueDate ? formatISODate(t.dueDate, "d MMM yyyy") : "-"}
                    {t.overdue ? <span className="block text-xs">Overdue</span> : null}
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
