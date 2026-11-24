import { Check, CircleDashed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const DONE = [
  { task: "Reconciled operating and card accounts", time: "2h 10m" },
  { task: "Entered 42 vendor bills, 3 flagged for approval", time: "2h 45m" },
  { task: "Sent AR reminders to 6 customers", time: "1h 05m" },
];
const WEEK = [
  ["Mon", 7.9],
  ["Tue", 8.1],
  ["Wed", 8.0],
  ["Thu", 8.3],
  ["Fri", 8.1],
] as const;

/** Product-style drawing of what a client receives each day. Clearly labelled as sample data. */
export function DailyReportMock({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <figure className={cn("rounded-3xl border border-border bg-surface shadow-lift", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="font-display text-[17px] font-semibold tracking-tight">Daily report</p>
          <p className="text-[13px] text-muted">Dedicated accountant, Friday</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[13px] font-medium text-success">
          <Clock className="size-3.5" aria-hidden />
          8h 05m
        </span>
      </div>
      <div className="px-6 py-5">
        <p className="text-[13px] font-medium text-muted">Completed today</p>
        <ul className="mt-3 space-y-3">
          {DONE.map((d) => (
            <li key={d.task} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              <span className="flex-1">{d.task}</span>
              <span className="tabular shrink-0 text-[13px] text-muted">{d.time}</span>
            </li>
          ))}
          <li className="flex items-start gap-3 text-[15px]">
            <CircleDashed className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <span className="flex-1">
              Month-end checklist
              <span className="block text-[13px] text-muted">Waiting for the loan statement from you</span>
            </span>
            <span className="tabular shrink-0 text-[13px] text-muted">2h 05m</span>
          </li>
        </ul>
        {compact ? null : (
          <div className="mt-5 rounded-2xl bg-surface-2 px-4 py-3.5 text-[15px]">
            <span className="text-[13px] font-medium text-muted">Next working day: </span>
            post payroll entry, draft the P&amp;L and balance sheet.
          </div>
        )}
      </div>
      <div className="border-t border-border px-6 py-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium text-muted">Hours this week</span>
          <span className="tabular font-medium">40h 24m</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2" aria-hidden>
          {WEEK.map(([day, h], i) => (
            <div key={day} className="text-center text-xs text-muted">
              <div className="flex h-14 items-end rounded-lg bg-surface-2">
                <div
                  className={cn("w-full rounded-lg", i === 4 ? "bg-brand" : "bg-accent/55")}
                  style={{ height: `${(h / 9) * 100}%` }}
                />
              </div>
              <span className="mt-1.5 block">{day}</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="border-t border-border px-6 py-3 text-xs text-muted">
        Illustration with sample data. Yours follows the format you choose.
      </figcaption>
    </figure>
  );
}
