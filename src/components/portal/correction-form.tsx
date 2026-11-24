"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { correctAttendanceAction, markReviewedAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import type { EventType } from "@/server/attendance-math";

const LABEL: Record<EventType, string> = {
  PUNCH_IN: "Punch in",
  LUNCH_START: "Lunch start",
  LUNCH_END: "Lunch end",
  PUNCH_OUT: "Punch out",
};
const NEXT: Record<EventType, EventType> = {
  PUNCH_IN: "LUNCH_START",
  LUNCH_START: "LUNCH_END",
  LUNCH_END: "PUNCH_OUT",
  PUNCH_OUT: "PUNCH_IN",
};

type Row = { key: number; type: EventType; at: string };

/** Edits a day's events. `at` values are wall-clock times in the company timezone. */
export function CorrectionButton({
  userId,
  workDate,
  name,
  events,
  shift,
}: {
  userId: string;
  workDate: string;
  name: string;
  events: { type: EventType; at: string }[];
  shift: { start: string; end: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="lg"
      trigger={
        <Button variant="outline">
          <Pencil aria-hidden /> Correct times
        </Button>
      }
      title={`Correct ${name}'s attendance`}
      description="The original values stay in the audit log."
    >
      <CorrectionForm
        userId={userId}
        workDate={workDate}
        events={events}
        shift={shift}
        onDone={() => setOpen(false)}
      />
    </Dialog>
  );
}

function CorrectionForm({
  userId,
  workDate,
  events,
  shift,
  onDone,
}: {
  userId: string;
  workDate: string;
  events: { type: EventType; at: string }[];
  shift: { start: string; end: string };
  onDone: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    (events.length
      ? events
      : [
          { type: "PUNCH_IN" as const, at: `${workDate}T${shift.start}` },
          { type: "PUNCH_OUT" as const, at: `${workDate}T${shift.end}` },
        ]
    ).map((e, key) => ({ ...e, key })),
  );
  const [reason, setReason] = useState("");
  const { run, pending, fieldErrors } = useAction(correctAttendanceAction, {
    success: "Attendance corrected.",
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const set = (key: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const add = () =>
    setRows((r) => {
      const last = r.at(-1);
      return [
        ...r,
        {
          key: Math.max(0, ...r.map((x) => x.key)) + 1,
          type: last ? NEXT[last.type] : "PUNCH_IN",
          at: last?.at ?? `${workDate}T${shift.start}`,
        },
      ];
    });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const sorted = [...rows].sort((a, b) => a.at.localeCompare(b.at));
        void run({ userId, workDate, events: sorted.map(({ type, at }) => ({ type, at })), reason });
      }}
    >
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_1fr_auto]">
            <Select
              aria-label={`Event ${i + 1} type`}
              value={r.type}
              onChange={(e) => set(r.key, { type: e.target.value as EventType })}
            >
              {Object.entries(LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Input
              type="datetime-local"
              aria-label={`Event ${i + 1} time`}
              className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
              required
              value={r.at}
              onChange={(e) => set(r.key, { at: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove event ${i + 1}`}
              onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus aria-hidden /> Add event
      </Button>
      <Field
        label="Reason"
        required
        hint="The employee sees this, and it is kept in the audit log."
        error={fieldErrors.reason}
      >
        <Textarea
          value={reason}
          maxLength={500}
          required
          minLength={5}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="brand" loading={pending}>
          Save correction
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ReviewedButton({ dayId }: { dayId: string }) {
  const router = useRouter();
  const { run, pending } = useAction(markReviewedAction, {
    success: "Marked as reviewed.",
    onSuccess: () => router.refresh(),
  });
  return (
    <Button variant="outline" loading={pending} onClick={() => void run({ dayId })}>
      <Check aria-hidden /> Mark reviewed
    </Button>
  );
}
