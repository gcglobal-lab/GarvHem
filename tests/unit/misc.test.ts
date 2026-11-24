import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { pgOptions } from "@/lib/db-url";
import { renderEmail } from "@/lib/email/template";
import { detectFileType, safeFilename, validateUpload } from "@/lib/storage/file-type";
import { isISODate } from "@/lib/time";
import { leadSchema } from "@/lib/validators/leads";
import { reportSchema } from "@/lib/validators/reports";
import { findMentions } from "@/server/mentions";
import { reportLockInstant } from "@/server/report-math";
import { buildSettings } from "@/server/settings-schema";
import { nextEmployeeCode } from "@/server/users";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array<number>(16).fill(0)]);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);

describe("uploads", () => {
  it("detects by magic bytes", () => {
    expect(detectFileType(PNG)?.ext).toBe("png");
    expect(detectFileType(PDF)?.ext).toBe("pdf");
    expect(detectFileType(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    const zip = bytes(0x50, 0x4b, 0x03, 0x04);
    expect(detectFileType(zip)).toBeNull();
    const docx = new Uint8Array([
      0x50,
      0x4b,
      3,
      4,
      ...new TextEncoder().encode("[Content_Types].xml word/document.xml"),
    ]);
    expect(detectFileType(docx)?.ext).toBe("docx");
    const macro = new Uint8Array([...docx, ...new TextEncoder().encode("word/vbaProject.bin")]);
    expect(detectFileType(macro)).toBeNull();
  });
  it("requires bytes, extension and MIME to agree", () => {
    expect(validateUpload("a.png", "image/png", PNG)).not.toBeNull();
    expect(validateUpload("a.pdf", "application/pdf", PNG)).toBeNull();
    expect(validateUpload("a.png", "text/html", PNG)).toBeNull();
    expect(validateUpload("a.exe", "image/png", PNG)).toBeNull();
    expect(validateUpload("a.png", "", new Uint8Array(0))).toBeNull();
  });
  it("cleans filenames", () => {
    expect(safeFilename('../../etc/"passwd"\r\n')).not.toMatch(/[/\\"\r\n]/);
    expect(safeFilename("...")).not.toMatch(/^\./);
  });
});

describe("csv", () => {
  it("escapes and defuses formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5");
    expect(toCsv(["a"], [[null]])).toContain("a\r\n");
  });
});

describe("mentions", () => {
  const people = [
    { id: "1", name: "Mohit" },
    { id: "2", name: "Abhishek Chaudhary" },
    { id: "3", name: "Mohit Rao" },
  ];
  it("finds full and unique first names once", () => {
    expect(findMentions("hi @Abhishek and @mohit rao", people).sort()).toEqual(["2", "3"]);
    expect(findMentions("@Mohit please check", people)).toEqual(["1"]);
    expect(findMentions("mail me at x@Mohit.com or @Nobody", people)).toEqual([]);
  });
});

describe("report cutoff", () => {
  it("treats midnight as the end of the work date", () => {
    expect(reportLockInstant("2026-11-25", "00:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-11-25T18:30:00.000Z",
    );
    expect(reportLockInstant("2026-11-25", "21:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-11-25T15:30:00.000Z",
    );
  });
  it("drops empty items and unsafe links", () => {
    const ok = reportSchema.parse({
      summary: "Did the work today",
      items: [{ text: "" }, { text: "Fixed it" }],
    });
    expect(ok.items).toHaveLength(1);
    expect(
      reportSchema.safeParse({ summary: "Did the work today", links: ["javascript:alert(1)"] }).success,
    ).toBe(false);
  });
});

describe("leads", () => {
  const lead = {
    fullName: "Jane Example",
    email: "Jane@Example.com",
    country: "USA",
    services: ["Dedicated Talent"],
    requirement: "We need two developers for a long project.",
    consent: true,
    sourcePage: "/contact",
  };
  it("accepts a minimal lead and normalises it", () => {
    const r = leadSchema.parse({ ...lead, headcount: "", budgetRange: "", startDate: "" });
    expect(r).toMatchObject({
      email: "jane@example.com",
      headcount: null,
      budgetRange: null,
      startDate: null,
    });
    expect(leadSchema.parse({ ...lead, headcount: "3" }).headcount).toBe(3);
  });
  it("rejects missing consent, short text and unknown values", () => {
    expect(leadSchema.safeParse({ ...lead, consent: false }).success).toBe(false);
    expect(leadSchema.safeParse({ ...lead, requirement: "short" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...lead, country: "Mars" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...lead, services: [] }).success).toBe(false);
  });
});

describe("settings", () => {
  it("falls back to defaults for missing or broken rows", () => {
    expect(buildSettings([]).attendance).toMatchObject({
      shiftStart: "09:30",
      graceMinutes: 15,
      lunchAllowanceMinutes: 60,
    });
    expect(buildSettings([{ key: "attendance", value: { graceMinutes: "x" } }]).attendance.graceMinutes).toBe(
      15,
    );
    expect(buildSettings([{ key: "company", value: { timezone: "Nope/Zone" } }]).company.timezone).toBe(
      "Asia/Kolkata",
    );
  });
});

describe("other helpers", () => {
  it("numbers employees", () => {
    expect(nextEmployeeCode([])).toBe("GRV-001");
    expect(nextEmployeeCode(["GRV-002", "GRV-010", "X-99"])).toBe("GRV-011");
  });
  it("encrypts and verifies remote database connections", () => {
    const base = { DATABASE_SSL: "auto", DATABASE_CA_CERT: undefined } as const;
    const options = (url: string, over = {}) => pgOptions({ ...base, ...over, DATABASE_URL: url });
    expect(options("postgresql://a:b@127.0.0.1:5432/x").ssl).toBe(false);
    const remote = options("postgresql://a:b@db.example.com/x?sslmode=disable&ssl=0");
    expect(remote.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(remote.connectionString).not.toContain("ssl");
    expect(options("postgresql://a:b@x.pooler.supabase.com:6543/postgres").ssl).toMatchObject({
      rejectUnauthorized: true,
      ca: expect.stringContaining("BEGIN CERTIFICATE"),
    });
    // a lookalike host must not get Supabase's root instead of the system ones
    expect(options("postgresql://a:b@supabase.co.evil.example/x").ssl).toMatchObject({ ca: undefined });
    expect(options("postgresql://a:b@db.example.com/x", { DATABASE_CA_CERT: "A\\nB" }).ssl).toMatchObject({
      ca: "A\nB",
    });
  });
  it("only accepts real calendar dates", () => {
    for (const ok of ["2026-02-28", "2028-02-29"]) expect(isISODate(ok)).toBe(true);
    for (const bad of ["2026-06-31", "2026-02-29", "9999-12-31", "2026-13-01", "26-01-01"])
      expect(isISODate(bad)).toBe(false);
  });
  it("escapes email content", () => {
    const { html } = renderEmail({ heading: "Hi", lines: ["<script>alert(1)</script>"] });
    expect(html).not.toContain("<script>");
  });
});
