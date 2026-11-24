import { AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Avatar, Table, Td, Th } from "@/components/ui/misc";
import { formatDateTime, formatISODate } from "@/lib/time";
import type { ReportView } from "@/server/reports";

export function ReportBody({ report, timezone }: { report: ReportView; timezone: string }) {
  const hours = report.items.reduce((s, i) => s + (i.hours ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Avatar name={report.user.name} className="size-10" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{report.user.name}</p>
          <p className="text-xs text-muted">
            {formatISODate(report.workDate, "EEEE, d MMM yyyy")}, sent{" "}
            {formatDateTime(report.createdAt, timezone)}
          </p>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed whitespace-pre-line">{report.summary}</p>
      {report.items.length ? (
        <div className="rounded-xl border border-border">
          <Table label="Work items">
            <thead>
              <tr>
                <Th>Task</Th>
                <Th>Details</Th>
                <Th className="text-right">Hours</Th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((i, n) => (
                <tr key={n}>
                  <Td>
                    {i.taskId ? (
                      <Link href={`/portal/tasks/${i.taskId}`} className="text-accent hover:underline">
                        {i.label}
                      </Link>
                    ) : (
                      <span className="text-muted">Other work</span>
                    )}
                  </Td>
                  <Td>{i.text}</Td>
                  <Td className="tabular text-right">{i.hours ?? "-"}</Td>
                </tr>
              ))}
              {hours > 0 ? (
                <tr>
                  <Td colSpan={2} className="font-semibold">
                    Total
                  </Td>
                  <Td className="tabular text-right font-semibold">{hours}</Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      ) : null}
      {report.blockers ? (
        <div className="rounded-xl bg-warning-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-warning">
            <AlertTriangle className="size-4" aria-hidden /> Blockers
          </p>
          <p className="mt-1 whitespace-pre-line">{report.blockers}</p>
        </div>
      ) : null}
      {report.tomorrowPlan ? (
        <div>
          <p className="text-sm font-semibold">Plan for tomorrow</p>
          <p className="mt-1 text-sm whitespace-pre-line text-muted">{report.tomorrowPlan}</p>
        </div>
      ) : null}
      {report.links.length ? (
        <ul className="space-y-1 text-sm">
          {report.links.map((l) => (
            <li key={l}>
              <a
                href={l}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex max-w-full items-center gap-1.5 text-accent hover:underline"
              >
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{l}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
