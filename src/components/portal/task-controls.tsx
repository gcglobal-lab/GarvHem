"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTaskAction, moveTaskAction, toggleChecklistAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CheckboxField, Field, Select } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import { TASK_STATUSES, type TaskStatusName } from "@/lib/validators/tasks";
import { TASK_STATUS } from "./status";

export function TaskStatusSelect({ id, status }: { id: string; status: TaskStatusName }) {
  const router = useRouter();
  const { run, pending } = useAction(moveTaskAction, {
    success: "Status updated.",
    onSuccess: () => router.refresh(),
  });
  return (
    <Field label="Status">
      <Select
        value={status}
        disabled={pending}
        onChange={(e) => void run({ id, status: e.target.value as TaskStatusName })}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS[s].label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function TaskChecklist({
  taskId,
  items,
}: {
  taskId: string;
  items: { id: string; text: string; done: boolean }[];
}) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const { run } = useAction(toggleChecklistAction, { onSuccess: () => router.refresh() });
  return (
    <ul className="space-y-2.5">
      {items.map((i) => {
        const done = overrides[i.id] ?? i.done;
        return (
          <li key={i.id}>
            <CheckboxField
              label={<span className={done ? "text-muted line-through" : undefined}>{i.text}</span>}
              checked={done}
              onCheckedChange={async (v) => {
                const next = v === true;
                setOverrides((o) => ({ ...o, [i.id]: next }));
                const r = await run({ taskId, itemId: i.id, done: next });
                if (!r.ok) setOverrides((o) => ({ ...o, [i.id]: !next }));
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function DeleteTaskButton({ id }: { id: string }) {
  const router = useRouter();
  const { run } = useAction(deleteTaskAction, {
    success: "Task deleted.",
    onSuccess: () => router.push("/portal/tasks"),
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger">
          <Trash2 aria-hidden /> Delete
        </Button>
      }
      title="Delete this task?"
      description="It disappears from every board. Comments and files go with it."
      confirmLabel="Delete task"
      onConfirm={() => run({ id })}
    />
  );
}
