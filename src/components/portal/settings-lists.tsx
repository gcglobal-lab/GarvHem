"use client";

import { Megaphone, PartyPopper, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { deleteLeaveTypeAction, saveLeaveTypeAction } from "@/actions/leaves";
import {
  deleteAnnouncementAction,
  deleteHolidayAction,
  saveAnnouncementAction,
  saveHolidayAction,
} from "@/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";
import { formatISODate, timeAgo } from "@/lib/time";
import type { AnnouncementRow, HolidayRow } from "@/server/company";
import type { LeaveTypeRow } from "@/server/leaves";

const EditIcon = ({ label }: { label: string }) => (
  <Button variant="ghost" size="icon-sm" aria-label={label}>
    <Pencil aria-hidden />
  </Button>
);
const addButton = (label: string) => (
  <Button variant="brand" size="sm">
    <Plus aria-hidden /> {label}
  </Button>
);

function Delete({ name, note, onConfirm }: { name: string; note: string; onConfirm: () => unknown }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 aria-hidden />
        </Button>
      }
      title={`Delete "${name}"?`}
      description={note}
      confirmLabel="Delete"
      onConfirm={onConfirm}
    />
  );
}

function FormFooter({ pending }: { pending: boolean }) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button type="submit" variant="brand" loading={pending}>
        Save
      </Button>
    </DialogFooter>
  );
}

/* ── Leave types ──────────────────────────────────────────────────────────── */

export function LeaveTypes({ types }: { types: LeaveTypeRow[] }) {
  const router = useRouter();
  const del = useAction(deleteLeaveTypeAction, {
    success: "Leave type deleted.",
    onSuccess: () => router.refresh(),
  });
  return (
    <>
      <div className="mb-4 flex justify-end">
        <LeaveTypeDialog trigger={addButton("Add type")} />
      </div>
      <Table label="Leave types">
        <thead>
          <tr>
            {["Type", "Pay", "Yearly quota", "Carry forward", "Status", ""].map((h, i) => (
              <Th key={i}>{h || <span className="sr-only">Actions</span>}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id}>
              <Td className="font-medium whitespace-nowrap">
                <span
                  className="mr-2 inline-block size-3 rounded-full"
                  style={{ background: t.color }}
                  aria-hidden
                />
                {t.name}
              </Td>
              <Td>{t.isPaid ? "Paid" : "Unpaid"}</Td>
              <Td className="tabular">{t.isUnlimited ? "No limit" : `${t.yearlyQuota} days`}</Td>
              <Td>{t.carryForward ? `Up to ${t.maxCarryForward} days` : "No"}</Td>
              <Td>
                <Badge tone={t.isActive ? "success" : "neutral"}>{t.isActive ? "Active" : "Inactive"}</Badge>
              </Td>
              <Td className="text-right whitespace-nowrap">
                <LeaveTypeDialog type={t} trigger={EditIcon({ label: `Edit ${t.name}` })} />
                <Delete
                  name={t.name}
                  note="Types with history cannot be deleted. Mark them inactive instead."
                  onConfirm={() => del.run({ id: t.id })}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

function LeaveTypeDialog({ type, trigger }: { type?: LeaveTypeRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={type ? `Edit ${type.name}` : "Add leave type"}
    >
      <LeaveTypeForm type={type} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function LeaveTypeForm({ type, onDone }: { type?: LeaveTypeRow; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<Omit<LeaveTypeRow, "id">>(
    type ?? {
      name: "",
      color: "#2F5BEA",
      isPaid: true,
      isUnlimited: false,
      yearlyQuota: 12,
      carryForward: false,
      maxCarryForward: 0,
      isActive: true,
    },
  );
  const { run, pending, fieldErrors } = useAction(saveLeaveTypeAction, {
    success: "Leave type saved.",
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
        void run({ ...v, id: type?.id });
      }}
    >
      <div className="grid grid-cols-[1fr_5rem] gap-4">
        <Field label="Name" required error={fieldErrors.name}>
          <Input
            value={v.name}
            required
            maxLength={60}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
        <Field label="Colour">
          <Input
            type="color"
            className="p-1"
            value={v.color}
            onChange={(e) => setV({ ...v, color: e.target.value })}
          />
        </Field>
      </div>
      <CheckboxField
        label="Paid leave"
        checked={v.isPaid}
        onCheckedChange={(c) => setV({ ...v, isPaid: c === true })}
      />
      <CheckboxField
        label="No balance limit"
        hint="Requests are not checked against a balance."
        checked={v.isUnlimited}
        onCheckedChange={(c) => setV({ ...v, isUnlimited: c === true })}
      />
      {v.isUnlimited ? null : (
        <Field label="Yearly quota (days)" error={fieldErrors.yearlyQuota}>
          <Input
            type="number"
            min={0}
            max={365}
            step={0.5}
            value={v.yearlyQuota}
            onChange={(e) => setV({ ...v, yearlyQuota: Number(e.target.value) })}
          />
        </Field>
      )}
      <CheckboxField
        label="Unused days carry forward"
        checked={v.carryForward}
        onCheckedChange={(c) => setV({ ...v, carryForward: c === true })}
      />
      {v.carryForward ? (
        <Field label="Maximum days carried forward" error={fieldErrors.maxCarryForward}>
          <Input
            type="number"
            min={0}
            max={365}
            step={0.5}
            value={v.maxCarryForward}
            onChange={(e) => setV({ ...v, maxCarryForward: Number(e.target.value) })}
          />
        </Field>
      ) : null}
      <CheckboxField
        label="Active"
        hint="Inactive types cannot be requested."
        checked={v.isActive}
        onCheckedChange={(c) => setV({ ...v, isActive: c === true })}
      />
      <FormFooter pending={pending} />
    </form>
  );
}

/* ── Holidays ─────────────────────────────────────────────────────────────── */

export function Holidays({ holidays, today }: { holidays: HolidayRow[]; today: string }) {
  const router = useRouter();
  const del = useAction(deleteHolidayAction, {
    success: "Holiday deleted.",
    onSuccess: () => router.refresh(),
  });
  return (
    <>
      <div className="mb-4 flex justify-end">
        <HolidayDialog today={today} trigger={addButton("Add holiday")} />
      </div>
      {holidays.length ? (
        <ul className="divide-y divide-border">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center gap-4 py-2.5">
              <span className="tabular w-36 shrink-0 text-sm text-muted">
                {formatISODate(h.date, "EEE, d MMM yyyy")}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{h.name}</span>
              {h.isOptional ? <Badge>Optional</Badge> : null}
              <span className="shrink-0">
                <HolidayDialog holiday={h} today={today} trigger={EditIcon({ label: `Edit ${h.name}` })} />
                <Delete
                  name={h.name}
                  note="Leave already decided keeps its day count."
                  onConfirm={() => del.run({ id: h.id })}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={PartyPopper} title="No holidays this year" />
      )}
    </>
  );
}

function HolidayDialog({
  holiday,
  today,
  trigger,
}: {
  holiday?: HolidayRow;
  today: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      size="sm"
      trigger={trigger}
      title={holiday ? "Edit holiday" : "Add holiday"}
    >
      <HolidayForm holiday={holiday} today={today} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function HolidayForm({
  holiday,
  today,
  onDone,
}: {
  holiday?: HolidayRow;
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState({
    date: holiday?.date ?? today,
    name: holiday?.name ?? "",
    isOptional: holiday?.isOptional ?? false,
  });
  const { run, pending, fieldErrors } = useAction(saveHolidayAction, {
    success: "Holiday saved.",
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
        void run({ ...v, id: holiday?.id });
      }}
    >
      <Field label="Name" required error={fieldErrors.name}>
        <Input
          value={v.name}
          required
          maxLength={100}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field label="Date" required error={fieldErrors.date}>
        <Input type="date" value={v.date} required onChange={(e) => setV({ ...v, date: e.target.value })} />
      </Field>
      <CheckboxField
        label="Optional holiday"
        hint="Shown to everyone, but still a working day."
        checked={v.isOptional}
        onCheckedChange={(c) => setV({ ...v, isOptional: c === true })}
      />
      <FormFooter pending={pending} />
    </form>
  );
}

/* ── Announcements ────────────────────────────────────────────────────────── */

export function Announcements({ items }: { items: AnnouncementRow[] }) {
  const router = useRouter();
  const del = useAction(deleteAnnouncementAction, {
    success: "Announcement deleted.",
    onSuccess: () => router.refresh(),
  });
  return (
    <>
      <div className="mb-4 flex justify-end">
        <AnnouncementDialog trigger={addButton("New announcement")} />
      </div>
      {items.length ? (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {a.title}
                  {a.pinned ? (
                    <Badge tone="accent">
                      <Pin aria-hidden /> Pinned
                    </Badge>
                  ) : null}
                  {a.expiresOn ? <Badge>Until {formatISODate(a.expiresOn, "d MMM")}</Badge> : null}
                </p>
                <p className="mt-0.5 text-sm whitespace-pre-line text-muted">{a.body}</p>
                <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                  {a.author}, {timeAgo(a.createdAt)}
                </p>
              </div>
              <span className="shrink-0">
                <AnnouncementDialog item={a} trigger={EditIcon({ label: `Edit ${a.title}` })} />
                <Delete
                  name={a.title}
                  note="It disappears from every dashboard."
                  onConfirm={() => del.run({ id: a.id })}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Share news with everyone's dashboard."
        />
      )}
    </>
  );
}

function AnnouncementDialog({ item, trigger }: { item?: AnnouncementRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={item ? "Edit announcement" : "New announcement"}
    >
      <AnnouncementForm item={item} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function AnnouncementForm({ item, onDone }: { item?: AnnouncementRow; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    title: item?.title ?? "",
    body: item?.body ?? "",
    pinned: item?.pinned ?? false,
    expiresOn: item?.expiresOn ?? "",
    notifyEveryone: !item,
  });
  const { run, pending, fieldErrors } = useAction(saveAnnouncementAction, {
    success: "Announcement saved.",
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
        void run({ ...v, id: item?.id });
      }}
    >
      <Field label="Title" required error={fieldErrors.title}>
        <Input
          value={v.title}
          required
          maxLength={140}
          onChange={(e) => setV({ ...v, title: e.target.value })}
        />
      </Field>
      <Field label="Message" required error={fieldErrors.body}>
        <Textarea
          value={v.body}
          required
          maxLength={4000}
          onChange={(e) => setV({ ...v, body: e.target.value })}
        />
      </Field>
      <Field label="Show until" hint="Leave empty to keep it.">
        <Input type="date" value={v.expiresOn} onChange={(e) => setV({ ...v, expiresOn: e.target.value })} />
      </Field>
      <CheckboxField
        label="Pin to the top"
        checked={v.pinned}
        onCheckedChange={(c) => setV({ ...v, pinned: c === true })}
      />
      <CheckboxField
        label="Send a notification to everyone"
        checked={v.notifyEveryone}
        onCheckedChange={(c) => setV({ ...v, notifyEveryone: c === true })}
      />
      <FormFooter pending={pending} />
    </form>
  );
}
