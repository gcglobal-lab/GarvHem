import { CalendarSearch } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { formatISODate, formatMinutes, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TimesheetRow } from "@/server/attendance";
import { DayStatusBadge } from "./status";

export function TimesheetTable({ rows, timezone }: { rows: TimesheetRow[]; timezone: string }) {
  if (!rows.length)
    return (
      <EmptyState
        icon={CalendarSearch}
        title="No records match"
        description="Widen the dates or clear a filter."
      />
    );
  return (
    <Table label="Timesheet">
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Employee</Th>
          <Th>Status</Th>
          <Th>Punch in</Th>
          <Th>Punch out</Th>
          <Th className="text-right">Lunch</Th>
          <Th className="text-right">Overrun</Th>
          <Th className="text-right">Net hours</Th>
          <Th>Late</Th>
          <Th>Flags</Th>
        </tr>
      </thead>
      <tbody className="tabular">
        {rows.map((r) => (
          <tr
            key={r.key}
            className={cn("relative hover:bg-surface-2/60", r.overrunMinutes > 0 && "bg-danger-soft/50")}
          >
            <Td className="whitespace-nowrap">
              <Link
                href={`/portal/admin/attendance/${r.userId}/${r.date}`}
                className="font-medium after:absolute after:inset-0"
              >
                {formatISODate(r.date, "EEE, d MMM")}
                <span className="sr-only">, {r.name}, open day</span>
              </Link>
            </Td>
            <Td className="whitespace-nowrap">{r.name}</Td>
            <Td>
              <DayStatusBadge status={r.status} />
            </Td>
            <Td className="whitespace-nowrap">{formatTime(r.firstIn, timezone)}</Td>
            <Td className="whitespace-nowrap">
              {r.isOpen ? <Badge tone="success">Still in</Badge> : formatTime(r.lastOut, timezone)}
            </Td>
            <Td className="text-right">{r.firstIn ? `${r.lunchMinutes}m` : "-"}</Td>
            <Td className={cn("text-right", r.overrunMinutes > 0 && "font-semibold text-danger")}>
              {r.overrunMinutes > 0 ? `+${r.overrunMinutes}m` : "-"}
            </Td>
            <Td className="text-right font-medium">{r.firstIn ? formatMinutes(r.netMinutes) : "-"}</Td>
            <Td>{r.isLate ? <Badge tone="warning">{r.lateMinutes}m</Badge> : "-"}</Td>
            <Td>
              <span className="flex gap-1">
                {r.needsReview ? <Badge tone="danger">Review</Badge> : null}
                {r.autoClosed ? <Badge tone="warning">Auto closed</Badge> : null}
                {r.isEarlyLeave ? <Badge>Left early</Badge> : null}
                {r.note?.startsWith("Corrected") ? <Badge tone="accent">Corrected</Badge> : null}
              </span>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
