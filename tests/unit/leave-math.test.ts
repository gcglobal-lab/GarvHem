import { describe, expect, it } from "vitest";
import {
  balanceFrom,
  carryForwardDays,
  daysByYear,
  leaveDays,
  spansClash,
  totalDays,
  type LeaveSpan,
} from "@/server/leave-math";

const cal = { workWeekDays: [1, 2, 3, 4, 5], holidays: new Set(["2026-12-25"]) };
const span = (from: string, to: string, firstHalfDay = false, lastHalfDay = false): LeaveSpan => ({
  from,
  to,
  firstHalfDay,
  lastHalfDay,
});
const days = (s: LeaveSpan) => totalDays(leaveDays(s, cal));

describe("working days", () => {
  it("skips weekends and holidays", () => {
    expect(days(span("2026-11-23", "2026-11-27"))).toBe(5);
    expect(days(span("2026-11-27", "2026-11-30"))).toBe(2);
    expect(days(span("2026-12-24", "2026-12-28"))).toBe(2);
    expect(days(span("2026-11-28", "2026-11-29"))).toBe(0);
  });
  it("handles half days at either end", () => {
    expect(days(span("2026-11-25", "2026-11-25", true))).toBe(0.5);
    expect(days(span("2026-11-23", "2026-11-25", true, true))).toBe(2);
  });
  it("ignores a half day that falls on a weekend", () => {
    expect(days(span("2026-11-28", "2026-11-30", true))).toBe(1);
  });
  it("supports six-day weeks", () => {
    expect(
      totalDays(leaveDays(span("2026-11-23", "2026-11-29"), { ...cal, workWeekDays: [1, 2, 3, 4, 5, 6] })),
    ).toBe(6);
  });
  it("splits requests across years", () => {
    const m = daysByYear(leaveDays(span("2026-12-30", "2027-01-04"), cal));
    expect(m.get(2026)).toBe(2);
    expect(m.get(2027)).toBe(2);
  });
});

describe("overlaps", () => {
  it("detects clashes", () => {
    expect(spansClash(span("2026-11-23", "2026-11-25"), span("2026-11-25", "2026-11-27"))).toBe(true);
    expect(spansClash(span("2026-11-23", "2026-11-24"), span("2026-11-25", "2026-11-27"))).toBe(false);
  });
  it("lets two half days share a date", () => {
    expect(
      spansClash(span("2026-11-23", "2026-11-25", false, true), span("2026-11-25", "2026-11-27", true)),
    ).toBe(false);
  });
});

describe("ledger balance", () => {
  it("sums every entry", () => {
    const b = balanceFrom(
      [
        { delta: 12, kind: "ALLOCATION" },
        { delta: 2.5, kind: "CARRY_FORWARD" },
        { delta: -1, kind: "ADJUSTMENT" },
        { delta: -3, kind: "DEDUCTION" },
        { delta: -0.5, kind: "DEDUCTION" },
        { delta: 3, kind: "REVERSAL" },
      ],
      2,
    );
    expect(b).toEqual({ allotted: 13.5, used: 0.5, pending: 2, remaining: 11 });
  });
  it("returns the full amount after a reversal", () => {
    const b = balanceFrom(
      [
        { delta: 6, kind: "ALLOCATION" },
        { delta: -2, kind: "DEDUCTION" },
        { delta: 2, kind: "REVERSAL" },
      ],
      0,
    );
    expect(b.remaining).toBe(6);
    expect(b.used).toBe(0);
  });
  it("may go negative through adjustments and says so", () => {
    expect(balanceFrom([{ delta: -1, kind: "ADJUSTMENT" }], 0).remaining).toBe(-1);
  });
});

describe("carry forward", () => {
  it("caps and filters", () => {
    expect(carryForwardDays(20, { carryForward: true, maxCarryForward: 15 })).toBe(15);
    expect(carryForwardDays(4.5, { carryForward: true, maxCarryForward: 15 })).toBe(4.5);
    expect(carryForwardDays(4, { carryForward: false, maxCarryForward: 15 })).toBe(0);
    expect(carryForwardDays(-2, { carryForward: true, maxCarryForward: 15 })).toBe(0);
  });
});
