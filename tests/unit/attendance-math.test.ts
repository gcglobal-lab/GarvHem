import { describe, expect, it } from "vitest";
import { instantAt, workDateOf } from "@/lib/time";
import {
  autoCloseInstant,
  computeDay,
  durations,
  emptyDayStatus,
  sequenceError,
  stateOf,
  transitionError,
  type AttEvent,
  type DayContext,
  type EventType,
} from "@/server/attendance-math";

const TZ = "Asia/Kolkata";
const D = "2026-11-25"; // a Wednesday
const at = (hhmm: string, date = D) => instantAt(date, hhmm, TZ);
const ev = (type: EventType, hhmm: string, date = D): AttEvent => ({ type, at: at(hhmm, date) });
const rules = {
  tz: TZ,
  shiftStart: "09:30",
  shiftEnd: "18:30",
  graceMinutes: 15,
  halfDayThresholdMinutes: 300,
  lunchAllowanceMinutes: 60,
};
const ctx = (over: Partial<DayContext> = {}): DayContext => ({
  workDate: D,
  isWorkingDay: true,
  rules,
  now: at("23:00"),
  ...over,
});
const day = (...pairs: [EventType, string][]) => pairs.map(([t, h]) => ev(t, h));

describe("work dates", () => {
  it("uses the company timezone, not UTC", () => {
    expect(workDateOf(new Date("2026-11-24T18:29:59Z"), TZ)).toBe("2026-11-24"); // 23:59:59 IST
    expect(workDateOf(new Date("2026-11-24T18:30:00Z"), TZ)).toBe("2026-11-25"); // 00:00 IST
    expect(workDateOf(new Date("2026-11-25T02:00:00Z"), "America/New_York")).toBe("2026-11-24");
  });
  it("converts wall-clock time to UTC", () => {
    expect(at("09:30").toISOString()).toBe("2026-11-25T04:00:00.000Z");
  });
  it("handles daylight saving in other timezones", () => {
    const start = instantAt("2026-03-08", "00:00", "America/New_York");
    const end = instantAt("2026-03-09", "00:00", "America/New_York");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });
});

describe("state and transitions", () => {
  const opts = { allowMultipleSessions: true, allowLunchSplit: true, lunchesTaken: 0 };
  it("derives the state from the last event", () => {
    expect(stateOf([])).toBe("NOT_IN");
    expect(stateOf(day(["PUNCH_IN", "09:30"]))).toBe("WORKING");
    expect(stateOf(day(["PUNCH_IN", "09:30"], ["LUNCH_START", "13:00"]))).toBe("ON_LUNCH");
    expect(stateOf(day(["PUNCH_IN", "09:30"], ["PUNCH_OUT", "18:30"]))).toBe("OUT");
  });
  it("blocks impossible actions", () => {
    expect(transitionError("WORKING", "PUNCH_IN", opts)).toMatch(/already punched in/);
    expect(transitionError("NOT_IN", "PUNCH_OUT", opts)).toMatch(/not punched in/);
    expect(transitionError("NOT_IN", "LUNCH_START", opts)).toMatch(/Punch in/);
    expect(transitionError("WORKING", "LUNCH_END", opts)).toMatch(/not on lunch/);
    expect(transitionError("ON_LUNCH", "LUNCH_START", opts)).toMatch(/already on lunch/);
  });
  it("allows punching out during lunch", () => {
    expect(transitionError("ON_LUNCH", "PUNCH_OUT", opts)).toBeNull();
  });
  it("respects the split-lunch and multi-session settings", () => {
    expect(transitionError("WORKING", "LUNCH_START", { ...opts, lunchesTaken: 1 })).toBeNull();
    expect(
      transitionError("WORKING", "LUNCH_START", { ...opts, allowLunchSplit: false, lunchesTaken: 1 }),
    ).not.toBeNull();
    expect(transitionError("OUT", "PUNCH_IN", opts)).toBeNull();
    expect(transitionError("OUT", "PUNCH_IN", { ...opts, allowMultipleSessions: false })).not.toBeNull();
  });
});

describe("computeDay", () => {
  it("computes a normal day", () => {
    const r = computeDay(
      day(["PUNCH_IN", "09:30"], ["LUNCH_START", "13:00"], ["LUNCH_END", "13:45"], ["PUNCH_OUT", "18:30"]),
      ctx(),
    );
    expect(r).toMatchObject({
      totalMinutes: 540,
      breakMinutes: 45,
      netMinutes: 495,
      lunchOverrun: false,
      isLate: false,
      isEarlyLeave: false,
      status: "PRESENT",
      isOpen: false,
    });
  });
  it("adds up split lunches and flags the overrun without blocking it", () => {
    const r = computeDay(
      day(
        ["PUNCH_IN", "09:30"],
        ["LUNCH_START", "12:00"],
        ["LUNCH_END", "12:40"],
        ["LUNCH_START", "16:00"],
        ["LUNCH_END", "16:35"],
        ["PUNCH_OUT", "18:30"],
      ),
      ctx(),
    );
    expect(r).toMatchObject({
      breakMinutes: 75,
      lunchOverrun: true,
      lunchOverrunMinutes: 15,
      netMinutes: 465,
    });
  });
  it("does not flag exactly 60 minutes", () => {
    const r = computeDay(
      day(["PUNCH_IN", "09:30"], ["LUNCH_START", "13:00"], ["LUNCH_END", "14:00"], ["PUNCH_OUT", "18:30"]),
      ctx(),
    );
    expect(r).toMatchObject({ breakMinutes: 60, lunchOverrun: false, lunchOverrunMinutes: 0 });
  });
  it("ends lunch at punch-out when it was still running", () => {
    const r = computeDay(day(["PUNCH_IN", "09:30"], ["LUNCH_START", "18:00"], ["PUNCH_OUT", "18:30"]), ctx());
    expect(r).toMatchObject({ breakMinutes: 30, netMinutes: 510, isOpen: false });
  });
  it("sums several sessions and ignores the gap between them", () => {
    const r = computeDay(
      day(["PUNCH_IN", "09:30"], ["PUNCH_OUT", "12:30"], ["PUNCH_IN", "14:30"], ["PUNCH_OUT", "18:30"]),
      ctx(),
    );
    expect(r).toMatchObject({ totalMinutes: 420, netMinutes: 420 });
    expect(r.lastOut).toEqual(at("18:30"));
  });
  it("crosses midnight", () => {
    const r = computeDay([ev("PUNCH_IN", "21:00"), ev("PUNCH_OUT", "02:15", "2026-11-26")], ctx());
    expect(r).toMatchObject({ totalMinutes: 315, netMinutes: 315, isEarlyLeave: false });
  });
  it("applies the grace period exactly", () => {
    const out: [EventType, string] = ["PUNCH_OUT", "18:30"];
    expect(computeDay(day(["PUNCH_IN", "09:45"], out), ctx())).toMatchObject({ isLate: false });
    expect(computeDay(day(["PUNCH_IN", "09:46"], out), ctx())).toMatchObject({
      isLate: true,
      lateMinutes: 16,
    });
  });
  it("marks early leave and half days", () => {
    const r = computeDay(day(["PUNCH_IN", "09:30"], ["PUNCH_OUT", "13:00"]), ctx());
    expect(r).toMatchObject({ isEarlyLeave: true, earlyLeaveMinutes: 330, status: "HALF_DAY" });
  });
  it("treats the half-day threshold as a minimum", () => {
    expect(computeDay(day(["PUNCH_IN", "09:30"], ["PUNCH_OUT", "14:30"]), ctx()).status).toBe("PRESENT");
    expect(computeDay(day(["PUNCH_IN", "09:30"], ["PUNCH_OUT", "14:29"]), ctx()).status).toBe("HALF_DAY");
  });
  it("never judges weekends or half-day leave as late or early", () => {
    const events = day(["PUNCH_IN", "13:00"], ["PUNCH_OUT", "16:00"]);
    expect(computeDay(events, ctx({ isWorkingDay: false }))).toMatchObject({
      isLate: false,
      isEarlyLeave: false,
      status: "PRESENT",
    });
    expect(computeDay(events, ctx({ halfDayLeave: true }))).toMatchObject({
      isLate: false,
      isEarlyLeave: false,
      status: "HALF_DAY",
    });
  });
  it("keeps an open day open and counts up to now", () => {
    const r = computeDay(day(["PUNCH_IN", "09:30"]), ctx({ now: at("11:00") }));
    expect(r).toMatchObject({
      isOpen: true,
      netMinutes: 90,
      lastOut: null,
      status: "PRESENT",
      isEarlyLeave: false,
    });
  });
  it("supports overnight shifts", () => {
    const night = { ...rules, shiftStart: "20:00", shiftEnd: "05:00" };
    const r = computeDay(
      [ev("PUNCH_IN", "20:05"), ev("PUNCH_OUT", "05:00", "2026-11-26")],
      ctx({ rules: night }),
    );
    expect(r).toMatchObject({ isLate: false, isEarlyLeave: false, totalMinutes: 535 });
  });
  it("reports leave and absence when there are no punches", () => {
    expect(computeDay([], ctx({ fullDayLeave: true })).status).toBe("ON_LEAVE");
    expect(computeDay([], ctx()).status).toBe("ABSENT");
  });
});

describe("live timers", () => {
  it("stops the work timer during lunch and runs the lunch timer", () => {
    const events = day(["PUNCH_IN", "09:30"], ["LUNCH_START", "13:00"]);
    const d = durations(events, at("13:20"));
    expect(d.state).toBe("ON_LUNCH");
    expect(d.netMs).toBe(3.5 * 3_600_000);
    expect(d.breakMs).toBe(20 * 60_000);
    expect(d.runningSince).toEqual(at("13:00"));
  });
});

describe("auto close", () => {
  it("puts an early-morning cutoff on the next day", () => {
    expect(autoCloseInstant(D, "03:00", rules)).toEqual(at("03:00", "2026-11-26"));
    expect(autoCloseInstant(D, "23:30", rules)).toEqual(at("23:30"));
  });
  it("never closes an overnight shift before it ends", () => {
    const night = { ...rules, shiftStart: "22:00", shiftEnd: "06:00" };
    expect(autoCloseInstant(D, "03:00", night).getTime()).toBeGreaterThan(
      at("06:00", "2026-11-26").getTime(),
    );
  });
});

describe("corrections", () => {
  it("accepts a valid sequence, including an open one", () => {
    expect(
      sequenceError(
        day(["PUNCH_IN", "09:00"], ["LUNCH_START", "13:00"], ["LUNCH_END", "13:30"], ["PUNCH_OUT", "18:00"]),
      ),
    ).toBeNull();
    expect(sequenceError(day(["PUNCH_IN", "09:00"]))).toBeNull();
  });
  it("rejects bad order, duplicates and endless days", () => {
    expect(sequenceError([])).not.toBeNull();
    expect(sequenceError(day(["PUNCH_OUT", "09:00"]))).not.toBeNull();
    expect(sequenceError(day(["PUNCH_IN", "09:00"], ["PUNCH_IN", "10:00"]))).not.toBeNull();
    expect(sequenceError(day(["PUNCH_IN", "10:00"], ["PUNCH_OUT", "10:00"]))).not.toBeNull();
    expect(sequenceError([ev("PUNCH_IN", "09:00"), ev("PUNCH_OUT", "22:00", "2026-11-26")])).not.toBeNull();
  });
});

describe("days without punches", () => {
  const base = {
    date: D,
    today: "2026-11-26",
    isWeekend: false,
    isHoliday: false,
    onLeave: false,
    joined: "2026-01-01",
  };
  it("derives the status", () => {
    expect(emptyDayStatus(base)).toBe("ABSENT");
    expect(emptyDayStatus({ ...base, today: D })).toBeNull();
    expect(emptyDayStatus({ ...base, isWeekend: true })).toBe("WEEKEND");
    expect(emptyDayStatus({ ...base, isHoliday: true })).toBe("HOLIDAY");
    expect(emptyDayStatus({ ...base, onLeave: true })).toBe("ON_LEAVE");
    expect(emptyDayStatus({ ...base, joined: "2026-12-01" })).toBeNull();
  });
});
