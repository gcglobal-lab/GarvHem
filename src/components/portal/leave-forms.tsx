"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { applyLeaveAction, cancelLeaveAction, previewLeaveAction } from "@/actions/leaves";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import { plural } from "@/lib/utils";
import { applyLeaveSchema } from "@/lib/validators/leaves";
import type { TypeBalance } from "@/server/leaves";

type Values = z.input<typeof applyLeaveSchema>;

export function ApplyLeaveButton({ balances, today }: { balances: TypeBalance[]; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="brand">Apply for leave</Button>}
      title="Apply for leave"
      description="Weekends and holidays are not counted."
    >
      <ApplyForm balances={balances} today={today} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function ApplyForm({
  balances,
  today,
  onDone,
}: {
  balances: TypeBalance[];
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      leaveTypeId: balances[0]?.typeId ?? "",
      from: today,
      to: today,
      firstHalfDay: false,
      lastHalfDay: false,
      reason: "",
    },
  });
  const [typeId, from, to, firstHalfDay, lastHalfDay] = useWatch({
    control: form.control,
    name: ["leaveTypeId", "from", "to", "firstHalfDay", "lastHalfDay"],
  });
  const [days, setDays] = useState<number | null>(null);
  const balance = balances.find((b) => b.typeId === typeId);
  const single = from === to;

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      if (!from || !to || from > to) return setDays(null);
      const r = await previewLeaveAction({
        from,
        to,
        firstHalfDay: firstHalfDay ?? false,
        lastHalfDay: single ? false : (lastHalfDay ?? false),
      });
      if (current) setDays(r.ok ? r.data : null);
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [from, to, firstHalfDay, lastHalfDay, single]);

  const { run, pending, fieldErrors } = useAction(applyLeaveAction, {
    success: (d) => `Request sent for ${plural(d.days, "day")}.`,
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const { errors } = form.formState;
  const short = balance && !balance.isUnlimited && days !== null && days > balance.remaining;

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-4">
      <Field label="Leave type" required error={errors.leaveTypeId?.message ?? fieldErrors.leaveTypeId}>
        <Select {...form.register("leaveTypeId")}>
          {balances.map((b) => (
            <option key={b.typeId} value={b.typeId}>
              {b.name} ({b.isUnlimited ? "no limit" : `${b.remaining} left`})
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" required error={errors.from?.message ?? fieldErrors.from}>
          <Input
            type="date"
            {...form.register("from", {
              onChange: (e: { target: { value: string } }) => {
                if (e.target.value > form.getValues("to")) form.setValue("to", e.target.value);
              },
            })}
          />
        </Field>
        <Field label="To" required error={errors.to?.message ?? fieldErrors.to}>
          <Input type="date" min={from} {...form.register("to")} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Controller
          control={form.control}
          name="firstHalfDay"
          render={({ field }) => (
            <CheckboxField
              label={single ? "Half day" : "First day is a half day"}
              checked={field.value ?? false}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
          )}
        />
        {single ? null : (
          <Controller
            control={form.control}
            name="lastHalfDay"
            render={({ field }) => (
              <CheckboxField
                label="Last day is a half day"
                checked={field.value ?? false}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
        )}
      </div>
      <p
        role="status"
        className={`rounded-xl px-4 py-3 text-sm ${short || days === 0 ? "bg-danger-soft text-danger" : "bg-surface-2"}`}
      >
        {days === null
          ? "Pick your dates to see the number of days."
          : days === 0
            ? "Those dates are all weekends or holidays."
            : short
              ? `${plural(days, "working day")} requested, only ${Math.max(0, balance.remaining)} available.`
              : `${plural(days, "working day")} will be requested.`}
      </p>
      <Field label="Reason" required error={errors.reason?.message ?? fieldErrors.reason}>
        <Textarea maxLength={1000} {...form.register("reason")} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="brand" loading={pending} disabled={Boolean(short) || days === 0}>
          Send request
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CancelLeaveButton({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const { run } = useAction(cancelLeaveAction, {
    success: approved ? "Leave cancelled and days returned." : "Request cancelled.",
    onSuccess: () => router.refresh(),
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
      }
      title="Cancel this leave?"
      description={
        approved
          ? "The days go back to your balance and your attendance is updated."
          : "Your request will be withdrawn."
      }
      confirmLabel="Cancel leave"
      onConfirm={() => run({ id })}
    />
  );
}
