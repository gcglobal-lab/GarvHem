"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustBalanceAction, bulkAllocateAction, decideLeaveAction } from "@/actions/leaves";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils";

export function DecideLeave({ id, name, summary }: { id: string; name: string; summary: string }) {
  return (
    <div className="flex gap-2">
      <DecideDialog id={id} name={name} summary={summary} decision="APPROVED" />
      <DecideDialog id={id} name={name} summary={summary} decision="REJECTED" />
    </div>
  );
}

function DecideDialog({
  id,
  name,
  summary,
  decision,
}: {
  id: string;
  name: string;
  summary: string;
  decision: "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const approve = decision === "APPROVED";
  const { run, pending, fieldErrors } = useAction(decideLeaveAction, {
    success: approve ? "Leave approved." : "Leave rejected.",
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={
        approve ? (
          <Button size="sm" variant="success">
            <Check aria-hidden /> Approve
          </Button>
        ) : (
          <Button size="sm" variant="danger">
            <X aria-hidden /> Reject
          </Button>
        )
      }
      title={approve ? `Approve ${name}'s leave?` : `Reject ${name}'s leave?`}
      description={summary}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run({ id, decision, note });
        }}
      >
        <Field label={approve ? "Comment (optional)" : "Reason"} required={!approve} error={fieldErrors.note}>
          <Textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" variant={approve ? "success" : "danger"} loading={pending}>
            {approve ? "Approve leave" : "Reject leave"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

type Option = { id: string; name: string };

/** Adds or subtracts days for one person and type. The reason is mandatory. */
export function AdjustBalance({
  people,
  types,
  year,
  userId,
}: {
  people: Option[];
  types: Option[];
  year: number;
  userId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Adjust balance</Button>}
      title="Adjust leave balance"
      description="Writes one ledger entry. Nothing is overwritten."
    >
      <AdjustForm people={people} types={types} year={year} userId={userId} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function AdjustForm({
  people,
  types,
  year,
  userId,
  onDone,
}: {
  people: Option[];
  types: Option[];
  year: number;
  userId?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState({
    userId: userId ?? people[0]?.id ?? "",
    leaveTypeId: types[0]?.id ?? "",
    sign: 1,
    days: "1",
    reason: "",
    year,
  });
  const { run, pending, fieldErrors } = useAction(adjustBalanceAction, {
    success: (d) => `Saved. ${d.remaining} days available now.`,
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run({
          userId: v.userId,
          leaveTypeId: v.leaveTypeId,
          year: v.year,
          delta: v.sign * Number(v.days),
          reason: v.reason,
        });
      }}
    >
      <Field label="Employee">
        <Select
          value={v.userId}
          disabled={Boolean(userId)}
          onChange={(e) => setV({ ...v, userId: e.target.value })}
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Leave type">
          <Select value={v.leaveTypeId} onChange={(e) => setV({ ...v, leaveTypeId: e.target.value })}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year">
          <Select value={v.year} onChange={(e) => setV({ ...v, year: Number(e.target.value) })}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Change</legend>
          <div className="flex rounded-xl bg-surface-2 p-1">
            {(
              [
                [1, "Add +"],
                [-1, "Subtract −"],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                aria-pressed={v.sign === s}
                onClick={() => setV({ ...v, sign: s })}
                className={cn(
                  "h-8 rounded-lg px-3 text-[13px] font-medium",
                  v.sign === s ? "bg-surface shadow-sm" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Days" error={fieldErrors.delta}>
          <Input
            type="number"
            min={0.5}
            max={365}
            step={0.5}
            required
            value={v.days}
            onChange={(e) => setV({ ...v, days: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Reason" required error={fieldErrors.reason}>
        <Textarea
          value={v.reason}
          required
          minLength={5}
          maxLength={500}
          onChange={(e) => setV({ ...v, reason: e.target.value })}
        />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="brand" loading={pending}>
          Save adjustment
        </Button>
      </DialogFooter>
    </form>
  );
}

export function BulkAllocate({ year }: { year: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(year + 1);
  const [carry, setCarry] = useState(true);
  const { run, pending } = useAction(bulkAllocateAction, {
    success: (d) =>
      d.created ? `${d.created} ledger entries created.` : "Everyone already has their allocation.",
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={<Button variant="outline">Yearly allocation</Button>}
      title="Allocate leave for a year"
      description="Credits each type's yearly quota to every active employee. Running it twice never credits twice."
    >
      <div className="space-y-4">
        <Field label="Year">
          <Select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {[year, year + 1].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </Field>
        <CheckboxField
          label="Carry unused days forward"
          hint="Only for types that allow it, up to their limit."
          checked={carry}
          onCheckedChange={(v) => setCarry(v === true)}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          variant="brand"
          loading={pending}
          onClick={() => void run({ year: target, carryForward: carry })}
        >
          Allocate
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
