"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { punchAction } from "@/actions/attendance";
import { saveReportAction } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { useAction } from "@/components/ui/use-action";
import { reportSchema } from "@/lib/validators/reports";
import type { ReportView } from "@/server/reports";
import { ATTENDANCE_KEY, stampAttendance } from "./use-attendance";

type Input_ = z.input<typeof reportSchema>;
type Output = z.output<typeof reportSchema>;
type TaskOption = { id: string; number: number; title: string };

export function ReportForm({
  report,
  tasks,
  punchOutAfter,
}: {
  report: ReportView | null;
  tasks: TaskOption[];
  punchOutAfter: boolean;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [links, setLinks] = useState((report?.links ?? []).join("\n"));
  const form = useForm<Input_, unknown, Output>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      summary: report?.summary ?? "",
      items: report?.items.map((i) => ({ taskId: i.taskId, text: i.text, hours: i.hours })) ?? [],
      blockers: report?.blockers ?? "",
      tomorrowPlan: report?.tomorrowPlan ?? "",
      links: report?.links ?? [],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const save = useAction(saveReportAction);
  const punch = useAction(punchAction, {
    success: "Punched out. See you tomorrow!",
    onSuccess: (state) => {
      client.setQueryData(ATTENDANCE_KEY, stampAttendance(state));
      router.push("/portal");
    },
  });

  const submit = (punchOut: boolean) =>
    form.handleSubmit(async (values) => {
      const result = await save.run(values);
      if (!result.ok) return;
      toast.success(report ? "Report updated." : "Report submitted.");
      void client.invalidateQueries({ queryKey: ATTENDANCE_KEY });
      if (punchOut) await punch.run({ action: "PUNCH_OUT" });
      router.refresh();
    });

  const { errors } = form.formState;
  const linkError = Array.isArray(errors.links) ? errors.links.find(Boolean)?.message : errors.links?.message;
  // Tasks from a saved report stay selectable even when they are no longer in the open list.
  const options = [
    ...tasks.map((t) => ({ id: t.id, label: `#${t.number} ${t.title}` })),
    ...(report?.items ?? [])
      .filter((i) => i.taskId && !tasks.some((t) => t.id === i.taskId))
      .map((i) => ({ id: i.taskId!, label: i.label ?? "Task" })),
  ];

  return (
    <form onSubmit={submit(punchOutAfter)} noValidate className="space-y-6">
      <Field
        label="What did you get done today?"
        required
        error={errors.summary?.message ?? save.fieldErrors.summary}
      >
        <Textarea
          className="min-h-36"
          maxLength={5000}
          placeholder="A short summary your manager can read in a minute."
          {...form.register("summary")}
        />
      </Field>

      <fieldset>
        <legend className="text-[13px] font-medium">Tasks worked on</legend>
        <div className="mt-2 space-y-3">
          {items.fields.map((f, i) => (
            <div
              key={f.id}
              className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_6.5rem_auto] sm:items-end"
            >
              <Field label="Task">
                <Select
                  {...form.register(`items.${i}.taskId`, { setValueAs: (v: string | null) => v || null })}
                >
                  <option value="">Other work</option>
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Details" error={errors.items?.[i]?.text?.message}>
                <Input maxLength={300} placeholder="What you did" {...form.register(`items.${i}.text`)} />
              </Field>
              <Field label="Hours" error={errors.items?.[i]?.hours?.message}>
                <Input
                  type="number"
                  step="0.25"
                  min={0}
                  max={24}
                  inputMode="decimal"
                  {...form.register(`items.${i}.hours`, {
                    setValueAs: (v: unknown) =>
                      v === "" || v === null || v === undefined ? null : Number(v),
                  })}
                />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => items.remove(i)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => items.append({ taskId: null, text: "", hours: null })}
        >
          <Plus aria-hidden /> Add item
        </Button>
      </fieldset>

      <div className="grid gap-5 lg:grid-cols-2">
        <Field
          label="Blockers or issues"
          hint="Leave empty if there are none."
          error={errors.blockers?.message}
        >
          <Textarea maxLength={3000} {...form.register("blockers")} />
        </Field>
        <Field label="Plan for tomorrow" error={errors.tomorrowPlan?.message}>
          <Textarea maxLength={3000} {...form.register("tomorrowPlan")} />
        </Field>
      </div>
      <Field label="Links" hint="One per line, starting with https://" error={linkError}>
        <Textarea
          className="min-h-16"
          value={links}
          onChange={(e) => {
            setLinks(e.target.value);
            form.setValue(
              "links",
              e.target.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean),
              { shouldValidate: form.formState.isSubmitted },
            );
          }}
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {punchOutAfter ? (
          <Button variant="outline" onClick={submit(false)} disabled={save.pending || punch.pending}>
            Save only
          </Button>
        ) : null}
        <Button type="submit" variant="brand" size="lg" loading={save.pending || punch.pending}>
          {punchOutAfter ? "Submit and punch out" : report ? "Update report" : "Submit report"}
        </Button>
      </div>
    </form>
  );
}
