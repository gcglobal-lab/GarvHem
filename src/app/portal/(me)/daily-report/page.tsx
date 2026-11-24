import type { Metadata } from "next";
import { FileText, Lock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { FileList } from "@/components/portal/file-upload";
import { PageHeader } from "@/components/portal/page-header";
import { ReportForm } from "@/components/portal/report-form";
import { ReportBody } from "@/components/portal/report-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { formatDateTime, formatISODate } from "@/lib/time";
import { todayState } from "@/server/attendance";
import { ownReport, reportHistory } from "@/server/reports";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Daily report" };

export default async function DailyReportPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePagePermission("own.reports");
  const p = await flatParams(searchParams);
  const [{ company }, own, history, state] = await Promise.all([
    getSettings(),
    ownReport(user),
    reportHistory(user.id, 20),
    todayState(user.id),
  ]);
  const tz = company.timezone;
  const isIn = state.state === "WORKING" || state.state === "ON_LUNCH";
  const { report } = own;

  return (
    <>
      <PageHeader
        title="Daily report"
        description={`For ${formatISODate(own.workDate, "EEEE, d MMMM")}. Editable until ${formatDateTime(own.lockAt, tz)}.`}
        actions={
          report ? <Badge tone="success">Submitted ✓</Badge> : <Badge tone="warning">Not submitted</Badge>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardBody className="sm:p-6">
              {own.locked ? (
                <>
                  <p className="mb-6 flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
                    <Lock className="size-4" aria-hidden /> The cutoff has passed, so this report is locked.
                  </p>
                  {report ? (
                    <ReportBody report={report} timezone={tz} />
                  ) : (
                    <EmptyState icon={FileText} title="No report was submitted" />
                  )}
                </>
              ) : (
                <ReportForm
                  key={report?.updatedAt ?? "new"}
                  report={report}
                  tasks={own.tasks}
                  punchOutAfter={p.punchout === "1" && isIn}
                />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Attachments" />
            <CardBody>
              {report ? (
                <FileList
                  owner="report"
                  ownerId={report.id}
                  canUpload={!own.locked}
                  files={report.attachments.map((a) => ({ ...a, canDelete: !own.locked }))}
                />
              ) : (
                <p className="text-sm text-muted">Submit the report first, then attach files to it.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Past reports" />
          <CardBody>
            {history.length ? (
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/portal/reports/${h.id}`} className="block py-3 hover:text-accent">
                      <span className="flex items-center justify-between gap-2 text-sm font-medium">
                        {formatISODate(h.workDate, "EEE, d MMM")}
                        <span className="flex items-center gap-1.5">
                          {h.hasBlockers ? <Badge tone="warning">Blocker</Badge> : null}
                          {h.comments ? (
                            <Badge>
                              <MessageSquare aria-hidden /> {h.comments}
                              <span className="sr-only">comments</span>
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{h.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={FileText}
                title="No reports yet"
                description="Your reports will be listed here."
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
