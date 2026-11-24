import type { Metadata } from "next";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { FileList } from "@/components/portal/file-upload";
import { PriorityBadge } from "@/components/portal/status";
import { DeleteTaskButton, TaskChecklist, TaskStatusSelect } from "@/components/portal/task-controls";
import { TaskEditorButton } from "@/components/portal/task-editor";
import { TaskFeed } from "@/components/portal/task-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Avatar } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { orNotFound } from "@/lib/page";
import { formatDateTime, formatISODate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getSettings } from "@/server/settings";
import { assignableUsers, taskDetail, taskFeed, taskLabels } from "@/server/tasks";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("own.tasks");
  const { id } = await params;
  const task = await orNotFound(taskDetail(user, id));
  const [feed, people, labels, { company }] = await Promise.all([
    taskFeed(user, id),
    assignableUsers(user),
    taskLabels(user),
    getSettings(),
  ]);

  return (
    <>
      <Link
        href="/portal/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Tasks
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="tabular text-sm text-muted">#{task.number}</p>
          <h1 className="text-2xl font-semibold sm:text-[28px]">{task.title}</h1>
        </div>
        {task.canEdit ? (
          <div className="flex gap-2">
            <TaskEditorButton
              key={task.updatedAt}
              task={task}
              people={people}
              labels={labels}
              trigger={
                <Button variant="outline">
                  <Pencil aria-hidden /> Edit
                </Button>
              }
            />
            <DeleteTaskButton id={task.id} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardBody className="sm:p-6">
              {task.description ? (
                <Markdown>{task.description}</Markdown>
              ) : (
                <p className="text-sm text-muted">No description.</p>
              )}
              {task.checklist.length ? (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold">
                    Checklist{" "}
                    <span className="font-normal text-muted">
                      {task.checklistDone} of {task.checklistTotal}
                    </span>
                  </p>
                  <TaskChecklist taskId={task.id} items={task.checklist} />
                </div>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Comments and activity" />
            <CardBody>
              <TaskFeed taskId={task.id} initial={feed} people={task.people} />
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardBody className="space-y-5">
              <TaskStatusSelect id={task.id} status={task.status} />
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Priority</dt>
                  <dd>
                    <PriorityBadge priority={task.priority} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Due</dt>
                  <dd className={cn("font-medium", task.overdue && "text-danger")}>
                    {formatISODate(task.dueDate)}
                    {task.overdue ? " (overdue)" : ""}
                  </dd>
                </div>
                {task.client ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Client</dt>
                    <dd className="font-medium">{task.client}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Created</dt>
                  <dd className="text-right">
                    {task.createdBy?.name ?? "System"}
                    <span className="block text-xs text-muted">
                      {formatDateTime(task.createdAt, company.timezone)}
                    </span>
                  </dd>
                </div>
              </dl>
              <div>
                <p className="mb-2 text-sm text-muted">Assignees</p>
                {task.assignees.length ? (
                  <ul className="space-y-2">
                    {task.assignees.map((a) => (
                      <li key={a.id} className="flex items-center gap-2.5 text-sm font-medium">
                        <Avatar name={a.name} className="size-7 text-[11px]" /> {a.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">Unassigned</p>
                )}
              </div>
              {task.labels.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {task.labels.map((l) => (
                    <Badge key={l}>{l}</Badge>
                  ))}
                </div>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Attachments" />
            <CardBody>
              <FileList owner="task" ownerId={task.id} files={task.attachmentList} canUpload />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
