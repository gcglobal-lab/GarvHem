"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Overlap between a shift in India and 9-to-5 in four US/Canadian zones.
 * Daylight time (March to November): IST is ahead of ET by 9.5 h, CT 10.5, MT 11.5, PT 12.5.
 * All positions are hours of the Eastern day.
 */
const ZONES = [
  { name: "Eastern", cities: "New York, Toronto", behindEt: 0 },
  { name: "Central", cities: "Chicago, Winnipeg", behindEt: 1 },
  { name: "Mountain", cities: "Denver, Calgary", behindEt: 2 },
  { name: "Pacific", cities: "Seattle, Vancouver", behindEt: 3 },
] as const;
const SHIFTS = [
  { key: "afternoon", label: "Afternoon shift", india: "1:30 PM to 10:30 PM", start: 4, end: 13 },
  { key: "evening", label: "Evening shift", india: "6:30 PM to 3:30 AM", start: 9, end: 18 },
  { key: "late", label: "Late shift", india: "9:30 PM to 6:30 AM", start: 12, end: 21 },
] as const;
const FROM = 4;
const TO = 22;
const pos = (h: number) => `${((h - FROM) / (TO - FROM)) * 100}%`;
const span = (a: number, b: number) => `${((b - a) / (TO - FROM)) * 100}%`;
const clock = (h: number) => `${((h + 11) % 12) + 1} ${h % 24 < 12 ? "AM" : "PM"}`;

export function TimezoneBand() {
  const [key, setKey] = useState<(typeof SHIFTS)[number]["key"]>("evening");
  const shift = SHIFTS.find((s) => s.key === key)!;

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-8 lg:p-10">
      <fieldset>
        <legend className="text-sm font-medium">Shift in India</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {SHIFTS.map((s) => (
            <label
              key={s.key}
              className="cursor-pointer rounded-xl border border-border px-4 py-3 transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name="shift"
                className="peer sr-only"
                checked={key === s.key}
                onChange={() => setKey(s.key)}
              />
              <span className="block text-[15px] font-medium">{s.label}</span>
              <span className="block text-[13px] text-muted peer-checked:text-primary-foreground/75">
                {s.india} India time
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-9 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-x-6">
        <div className="relative col-start-1 h-5 text-xs text-muted sm:col-start-2" aria-hidden>
          {[6, 9, 12, 15, 18, 21].map((h) => (
            <span
              key={h}
              className="absolute -translate-x-1/2 whitespace-nowrap max-sm:even:hidden"
              style={{ left: pos(h) }}
            >
              {clock(h)}
            </span>
          ))}
        </div>
        <div className="col-start-2 text-right text-xs text-muted sm:col-start-3">Shared</div>
        {ZONES.map((z) => {
          const a = 9 + z.behindEt;
          const b = 17 + z.behindEt;
          const from = Math.max(a, shift.start);
          const to = Math.min(b, shift.end);
          const shared = Math.max(0, to - from);
          return (
            <div key={z.name} className="contents">
              <p className="col-span-2 mt-4 text-[15px] font-medium sm:col-span-1 sm:mt-0 sm:self-center">
                {z.name}
                <span className="ml-2 text-[13px] font-normal text-muted sm:ml-0 sm:block">{z.cities}</span>
              </p>
              <div className="relative col-start-1 my-2 h-11 sm:col-start-2" aria-hidden>
                <span className="absolute inset-y-0 left-0 w-full rounded-lg bg-surface-2" />
                <span
                  className="absolute inset-y-1 rounded-md border border-input bg-surface"
                  style={{ left: pos(a), width: span(a, b) }}
                />
                <span
                  className="absolute inset-y-0 rounded-lg border-2 border-brand transition-[left,width] duration-500"
                  style={{ left: pos(shift.start), width: span(shift.start, shift.end) }}
                />
                <span
                  className="absolute inset-y-1 grid place-items-center overflow-hidden rounded-md bg-ink text-xs font-medium whitespace-nowrap text-white transition-[left,width] duration-500"
                  style={{ left: pos(from), width: span(from, Math.max(from, to)) }}
                >
                  {shared >= 4 ? <span className="hidden sm:block">Shared hours</span> : null}
                </span>
              </div>
              <p
                className={cn(
                  "col-start-2 self-center text-right font-display text-2xl font-semibold sm:col-start-3",
                  !shared && "text-muted",
                )}
              >
                {shared}
                <span className="ml-0.5 text-sm font-medium text-muted">h</span>
                <span className="sr-only"> of shared time between 9 AM and 5 PM {z.name} time</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-5 rounded border border-input bg-surface" /> Your 9 AM to 5 PM
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-5 rounded border-2 border-brand" /> Your GARVHEM team
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-5 rounded bg-ink" /> Shared hours
        </span>
        <span>
          Scale in Eastern daylight time. In winter we move the shift by one hour to keep the overlap.
        </span>
      </div>
    </div>
  );
}
