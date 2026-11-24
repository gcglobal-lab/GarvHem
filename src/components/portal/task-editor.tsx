"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { saveTaskAction } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Markdown } from "@/components/ui/markdown";
import { useAction } from "@/components/ui/use-action";
import { TASK_PRIORITIES, taskSchema } from "@/lib/validators/tasks";
import type { TaskDetail } from "@/server/tasks";
import { TASK_PRIORITY } from "./status";

type In = z.input<typeof taskSchema>;
type Out = z.output<typeof taskSchema>;
type Person = { id: string; name: string };

export function TaskEditorButton({
  trigger,
  people,
  task,
  labels,
}: {
  trigger: ReactNode;
  people: Person[];
  task?: TaskDetail;
  labels: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      size="lg"
      title={task ? "Edit task" : "New task"}
    >
      <Editor people={people} task={task} labels={labels} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function Editor({
  people,
  task,
  labels,
  onDone,
}: {
  people: Person[];
  task?: TaskDetail;
  labels: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      id: task?.id,
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeIds: task?.assignees.map((a) => a.id) ?? [],
      priority: task?.priority ?? "MEDIUM",
      dueDate: task?.dueDate ?? "",
      labels: task?.labels ?? [],
      client: task?.client ?? "",
      checklist: task?.checklist ?? [],
    },
  });
  // keyName keeps react-hook-form's own key apart from the checklist item's id
  const checklist = useFieldArray({ control: form.control, name: "checklist", keyName: "key" });
  const description = useWatch({ control: form.control, name: "description" }) ?? "";
  const { run, pending, fieldErrors } = useAction(saveTaskAction, {
    success: task ? "Task updated." : "Task created.",
    onSuccess: ({ id }) => {
      onDone();
      if (task) router.refresh();
      else router.push(`/portal/tasks/${id}`);
    },
  });
  const { errors } = form.formState;
  // Current assignees stay listed even if they are outside the editor's own team.
  const everyone = [...people, ...(task?.assignees ?? []).filter((a) => !people.some((p) => p.id === a.id))];

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Field label="Title" required error={errors.title?.message ?? fieldErrors.title}>
        <Input maxLength={160} {...form.register("title")} />
      </Field>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[13px] font-medium" id="task-description-label">
            Description <span className="font-normal text-muted">(markdown)</span>
          </span>
          <Button variant="link" size="sm" onClick={() => setPreview((v) => !v)} disabled={!description}>
            {preview ? "Write" : "Preview"}
          </Button>
        </div>
        {preview ? (
          <div className="min-h-32 rounded-xl border border-border p-3.5">
            <Markdown>{description}</Markdown>
          </div>
        ) : (
          <Textarea
            aria-labelledby="task-description-label"
            className="min-h-32"
            maxLength={20000}
            {...form.register("description")}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Priority">
          <Select {...form.register("priority")}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date" error={errors.dueDate?.message}>
          <Input type="date" {...form.register("dueDate")} />
        </Field>
        <Field label="Client or project">
          <Input maxLength={120} {...form.register("client")} />
        </Field>
      </div>

      <Controller
        control={form.control}
        name="assigneeIds"
        render={({ field }) => {
          const value = field.value ?? [];
          return (
            <fieldset>
              <legend className="text-[13px] font-medium">Assignees</legend>
              <div className="mt-2 grid max-h-44 scrollbar-thin gap-2.5 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2">
                {everyone.map((p) => (
                  <CheckboxField
                    key={p.id}
                    label={p.name}
                    checked={value.includes(p.id)}
                    onCheckedChange={(on) =>
                      field.onChange(on === true ? [...value, p.id] : value.filter((id) => id !== p.id))
                    }
                  />
                ))}
                {!everyone.length ? <p className="text-sm text-muted">No one to assign yet.</p> : null}
              </div>
            </fieldset>
          );
        }}
      />

      <Controller
        control={form.control}
        name="labels"
        render={({ field }) => (
          <LabelInput value={field.value ?? []} onChange={field.onChange} suggestions={labels} />
        )}
      />

      <fieldset>
        <legend className="text-[13px] font-medium">Checklist</legend>
        <div className="mt-2 space-y-2">
          {checklist.fields.map((f, i) => (
            <div key={f.key} className="flex gap-2">
              <Input
                aria-label={`Checklist item ${i + 1}`}
                maxLength={240}
                aria-invalid={Boolean(errors.checklist?.[i]?.text) || undefined}
                {...form.register(`checklist.${i}.text`)}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove checklist item ${i + 1}`}
                onClick={() => checklist.remove(i)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => checklist.append({ text: "", done: false })}
        >
          <Plus aria-hidden /> Add item
        </Button>
      </fieldset>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="brand" loading={pending}>
          {task ? "Save changes" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LabelInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
}) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const label = raw.trim().slice(0, 40);
    if (label && !value.includes(label) && value.length < 12) onChange([...value, label]);
    setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text) onChange(value.slice(0, -1));
  };
  return (
    <Field label="Labels" hint='Press Enter to add, for example "Website" or "Client: X".'>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((l) => (
            <li
              key={l}
              className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-1 pl-2.5 text-xs font-medium"
            >
              {l}
              <button
                type="button"
                aria-label={`Remove label ${l}`}
                onClick={() => onChange(value.filter((x) => x !== l))}
                className="grid size-5 place-items-center rounded-full hover:bg-border"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        list="task-label-suggestions"
        value={text}
        maxLength={40}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(text)}
      />
      <datalist id="task-label-suggestions">
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </Field>
  );
}
