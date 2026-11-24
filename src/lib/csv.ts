/** RFC 4180 CSV with spreadsheet formula-injection protection. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value !== "number" && /^[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/.test(s)) s = `'${s}`;
  // Semicolons and tabs are quoted too: some spreadsheet locales split on them.
  return /[",;\t\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const csvResponse = (filename: string, body: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
