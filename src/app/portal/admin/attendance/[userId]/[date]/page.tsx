import type { Metadata } from "next";
import { ArrowLeft, Coffee, LogIn, LogOut, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CorrectionButton, ReviewedButton } from "@/components/portal/correction-form";
import { PageHeader, Stat } from "@/components/portal/page-header";
import { DayStatusBadge } from "@/components/portal/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { orNotFound } from "@/lib/page";
import {
  formatDateTime,
  formatISODate,
  formatMinutes,
  formatTime,
  isISODate,
  toLocalInput,
  workDateOf,
} from "@/lib/time";
import { describeUserAgent } from "@/lib/user-agent";
import { buildRows, canEditAttendance, dayDetail } from "@/server/attendance";
import { memberById } from "@/server/scope";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Day detail" };

const EVENT = {
  PUNCH_IN: { label: "Punch in", icon: LogIn },
  LUNCH_START: { label: "Lunch start", icon: Coffee },
  LUNCH_END: { label: "Lunch end", icon: UtensilsCrossed },
  PUNCH_OUT: { label: "Punch out", icon: LogOut },
} as const;

type Props = { params: Promise<{ userId: string; date: string }> };

export default async function DayPage({ params }: Props) {
  const user = await requirePagePermission("team.attendance.view");
  const { userId, date } = await params;
  if (!isISODate(date)) notFound();
  const [{ company, attendance }, detail] = await Promise.all([
    getSettings(),
    orNotFound(dayDetail(user, userId, date)),
  ]);
  const tz = company.timezone;
  const member = await memberById(userId);
  const row = (await buildRows([member], date, date))[0];
  const { day } = detail;
  const canEdit = canEditAttendance(user, userId) && date <= workDateOf(new Date(), tz);

  return (
    <>
      <Link
        href="/portal/admin/attendance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Timesheets
      </Link>
      <PageHeader
        title={detail.person.name}
        description={`${detail.person.employeeCode}, ${formatISODate(date, "EEEE, d MMMM yyyy")}`}
        actions={
          <>
            {canEdit && day?.needsReview ? <ReviewedButton dayId={day.id} /> : null}
            {canEdit ? (
              <CorrectionButton
                userId={userId}
                workDate={date}
                name={detail.person.name}
                events={(day?.events ?? []).map((e) => ({ type: e.type, at: toLocalInput(e.at, tz) }))}
                shift={{
                  start: member.shiftStart ?? attendance.shiftStart,
                  end: member.shiftEnd ?? attendance.shiftEnd,
                }}
              />
            ) : null}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <DayStatusBadge status={row?.status ?? null} />
        {row?.isLate ? <Badge tone="warning">Late by {row.lateMinutes} min</Badge> : null}
        {row && row.overrunMinutes > 0 ? (
          <Badge tone="danger">Lunch overrun {row.overrunMinutes} min</Badge>
        ) : null}
        {row?.isEarlyLeave ? <Badge>Left early</Badge> : null}
        {row?.autoClosed ? <Badge tone="warning">Closed automatically</Badge> : null}
        {row?.needsReview ? <Badge tone="danger">Needs review</Badge> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="First in" value={formatTime(row?.firstIn, tz)} />
        <Stat label="Last out" value={row?.isOpen ? "Still in" : formatTime(row?.lastOut, tz)} />
        <Stat
          label="Lunch taken"
          value={formatMinutes(row?.lunchMinutes ?? 0)}
          hint={`Allowance ${attendance.lunchAllowanceMinutes}m`}
        />
        <Stat
          label="Net hours"
          value={formatMinutes(row?.netMinutes ?? 0)}
          hint={`${formatMinutes(row?.totalMinutes ?? 0)} in total`}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title="Timeline" />
          <CardBody>
            {day?.events.length ? (
              <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-border">
                {day.events.map((e) => {
                  const ev = EVENT[e.type];
                  return (
                    <li key={e.id} className="relative flex gap-4">
                      <span className="z-10 grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface">
                        <ev.icon className="size-4 text-muted" aria-hidden />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold">
                          {ev.label} <span className="tabular font-normal">{formatDateTime(e.at, tz)}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {e.source === "USER"
                            ? `${describeUserAgent(e.userAgent)}, IP ${e.ip ?? "unknown"}`
                            : e.source === "SYSTEM"
                              ? "Added by the system"
                              : "Added by a correction"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState icon={LogIn} title="No punches on this day" />
            )}
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader title="Corrections" />
          <CardBody>
            {detail.corrections.length ? (
              <ul className="space-y-4 text-sm">
                {detail.corrections.map((c) => (
                  <li key={c.id}>
                    <p>{c.reason}</p>
                    <p className="text-xs text-muted">
                      {c.by}, {formatDateTime(c.at, tz)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">This day has not been corrected.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
