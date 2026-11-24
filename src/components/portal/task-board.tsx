"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveTaskAction } from "@/actions/tasks";
import { useAction } from "@/components/ui/use-action";
import { TASK_STATUSES, type TaskStatusName } from "@/lib/validators/tasks";
import type { TaskCard } from "@/server/tasks";
import { Kanban } from "./kanban";
import { TASK_STATUS } from "./status";
import { TaskCardBody } from "./task-card";

const DOTS: Record<TaskStatusName, string> = {
  TODO: "var(--muted)",
  IN_PROGRESS: "var(--chart-1)",
  IN_REVIEW: "var(--chart-4)",
  DONE: "var(--chart-3)",
};
const COLUMNS = TASK_STATUSES.map((key) => ({ key, label: TASK_STATUS[key].label, dot: DOTS[key] }));

export function TaskBoard({ tasks }: { tasks: TaskCard[] }) {
  const router = useRouter();
  const { run } = useAction(moveTaskAction);
  return (
    <Kanban
      columns={COLUMNS}
      items={tasks}
      label="Task board"
      canDrag
      itemName={(t) => t.title}
      renderCard={(t) => (
        <Link href={`/portal/tasks/${t.id}`} className="block rounded-lg" draggable={false}>
          <TaskCardBody task={t} />
        </Link>
      )}
      onMove={async (t, status, beforeId) => {
        const r = await run({ id: t.id, status: status as TaskStatusName, beforeId });
        if (r.ok) router.refresh();
        return r.ok;
      }}
    />
  );
}
