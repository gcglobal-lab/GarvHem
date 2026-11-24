import { formatISODate, formatMinutes, formatTime, weekdayOf } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TimesheetRow } from "@/server/attendance";
import { DAY_STATUS } from "./status";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AttendanceCalendar({
  rows,
  today,
  timezone,
}: {
  rows: TimesheetRow[];
  today: string;
  timezone: string;
}) {
  const offset = rows[0] ? (weekdayOf(rows[0].date) + 6) % 7 : 0;
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-hidden>
        {DAYS.map((d) => (
          <p key={d} className="pb-1 text-center text-xs text-muted">
            {d}
          </p>
        ))}
      </div>
      <ul className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: offset }, (_, i) => (
          <li key={`blank-${i}`} aria-hidden />
        ))}
        {rows.map((r) => {
          const s = r.status ? DAY_STATUS[r.status] : null;
          return (
            <li
              key={r.date}
              className={cn(
                "min-h-16 rounded-xl border border-border/70 p-1.5 sm:min-h-24 sm:p-2.5",
                s?.cell,
                r.date === today && "ring-2 ring-ring",
              )}
            >
              <span className="flex items-center justify-between text-xs font-semibold">
                <span>
                  {Number(r.date.slice(8))}
                  <span className="sr-only"> {formatISODate(r.date, "MMMM")}</span>
                </span>
                {r.overrunMinutes > 0 ? (
                  <span className="size-2 rounded-full bg-danger" title="Lunch overrun" />
                ) : null}
              </span>
              <span className="mt-1 block text-[10px] leading-tight sm:text-xs">
                {s ? (
                  <>
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </>
                ) : null}
              </span>
              {r.firstIn ? (
                <span className="tabular mt-1 hidden text-xs sm:block">
                  {formatMinutes(r.netMinutes)}
                  <span className="sr-only">, in at {formatTime(r.firstIn, timezone)}</span>
                  {r.isLate ? ", late" : ""}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {Object.values(DAY_STATUS).map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              className={cn("grid size-5 place-items-center rounded-md text-[10px] font-semibold", s.cell)}
              aria-hidden
            >
              {s.short}
            </span>
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-danger" aria-hidden /> Lunch overrun
        </li>
      </ul>
    </div>
  );
}
