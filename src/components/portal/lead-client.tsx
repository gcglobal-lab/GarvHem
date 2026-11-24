"use client";

import { CalendarClock, Paperclip, StickyNote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addLeadNoteAction, moveLeadAction, updateLeadAction } from "@/actions/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import { formatISODate, timeAgo } from "@/lib/time";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatusName } from "@/lib/validators/leads";
import type { LeadRow } from "@/server/leads";
import { Kanban } from "./kanban";

const DOTS: Record<LeadStatusName, string> = {
  NEW: "var(--brand)",
  CONTACTED: "var(--chart-1)",
  QUALIFIED: "var(--chart-4)",
  PROPOSAL_SENT: "var(--chart-5)",
  WON: "var(--chart-3)",
  LOST: "var(--muted)",
};
const COLUMNS = LEAD_STATUSES.map((key) => ({ key, label: LEAD_STATUS_LABEL[key], dot: DOTS[key] }));

export function LeadBoard({ leads, canManage }: { leads: LeadRow[]; canManage: boolean }) {
  const router = useRouter();
  const { run } = useAction(moveLeadAction, { success: "Lead updated." });
  return (
    <Kanban
      columns={COLUMNS}
      items={leads}
      label="Lead pipeline"
      canDrag={canManage}
      itemName={(l) => l.fullName}
      renderCard={(l) => (
        <Link href={`/portal/admin/leads/${l.id}`} className="block rounded-lg" draggable={false}>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{l.fullName}</span>
            {l.status === "NEW" ? <Badge tone="brand">New</Badge> : null}
          </span>
          <span className="block truncate text-xs text-muted">
            {[l.company, l.country].filter(Boolean).join(", ")}
          </span>
          <span className="mt-2 flex flex-wrap gap-1">
            {l.services.slice(0, 2).map((s) => (
              <Badge key={s} className="max-w-full">
                <span className="truncate">{s}</span>
              </Badge>
            ))}
            {l.services.length > 2 ? <Badge>+{l.services.length - 2}</Badge> : null}
          </span>
          <span className="mt-2.5 flex items-center gap-3 text-xs text-muted [&_svg]:size-3.5 [&>span]:flex [&>span]:items-center [&>span]:gap-1">
            <time dateTime={l.createdAt} suppressHydrationWarning>
              {timeAgo(l.createdAt)}
            </time>
            {l.followUpDate ? (
              <span>
                <CalendarClock aria-hidden /> {formatISODate(l.followUpDate, "d MMM")}
              </span>
            ) : null}
            {l.notes ? (
              <span>
                <StickyNote aria-hidden /> {l.notes}
              </span>
            ) : null}
            {l.attachments ? <Paperclip aria-label="Has attachment" /> : null}
          </span>
        </Link>
      )}
      onMove={async (l, status) => {
        if (l.status === status) return true;
        const r = await run({ id: l.id, status: status as LeadStatusName });
        if (r.ok) router.refresh();
        return r.ok;
      }}
    />
  );
}

export function LeadControls({
  id,
  status,
  ownerId,
  followUpDate,
  owners,
  canManage,
}: {
  id: string;
  status: LeadStatusName;
  ownerId: string;
  followUpDate: string;
  owners: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [owner, setOwner] = useState(ownerId);
  const [date, setDate] = useState(followUpDate);
  const move = useAction(moveLeadAction, { success: "Status updated.", onSuccess: () => router.refresh() });
  const update = useAction(updateLeadAction, { success: "Lead saved.", onSuccess: () => router.refresh() });
  return (
    <div className="space-y-4">
      <Field label="Status">
        <Select
          value={status}
          disabled={!canManage || move.pending}
          onChange={(e) => void move.run({ id, status: e.target.value as LeadStatusName })}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void update.run({ id, ownerId: owner, followUpDate: date });
        }}
      >
        <Field label="Owner">
          <Select value={owner} disabled={!canManage} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Follow-up date">
          <Input type="date" value={date} disabled={!canManage} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {canManage ? (
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            loading={update.pending}
            disabled={owner === ownerId && date === followUpDate}
          >
            Save
          </Button>
        ) : null}
      </form>
    </div>
  );
}

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const { run, pending } = useAction(addLeadNoteAction, {
    success: "Note added.",
    onSuccess: () => {
      setBody("");
      router.refresh();
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) void run({ leadId, body });
      }}
    >
      <Field label="Add an internal note">
        <Textarea value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending} disabled={!body.trim()}>
        Add note
      </Button>
    </form>
  );
}
