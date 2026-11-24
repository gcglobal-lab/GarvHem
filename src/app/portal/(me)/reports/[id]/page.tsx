import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { ReportCommentForm } from "@/components/portal/comment-box";
import { FileList } from "@/components/portal/file-upload";
import { PageHeader } from "@/components/portal/page-header";
import { ReportBody } from "@/components/portal/report-view";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { orNotFound } from "@/lib/page";
import { formatISODate, timeAgo } from "@/lib/time";
import { getReport } from "@/server/reports";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("own.reports");
  const report = await orNotFound(getReport(user, (await params).id));
  const { company } = await getSettings();
  return (
    <>
      <PageHeader title={`Report, ${formatISODate(report.workDate, "d MMM yyyy")}`} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardBody className="sm:p-6">
            <ReportBody report={report} timezone={company.timezone} />
            {report.attachments.length ? (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold">Attachments</p>
                <FileList
                  owner="report"
                  ownerId={report.id}
                  canUpload={false}
                  files={report.attachments.map((a) => ({ ...a, canDelete: false }))}
                />
              </div>
            ) : null}
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader title="Feedback" />
          <CardBody className="space-y-5">
            {report.comments.length ? (
              <ul className="space-y-4">
                {report.comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.author} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {c.author}{" "}
                        <span className="text-xs font-normal text-muted">{timeAgo(c.createdAt)}</span>
                      </p>
                      <p className="mt-0.5 text-sm whitespace-pre-line">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={MessageSquare} title="No feedback yet" className="py-4" />
            )}
            <ReportCommentForm reportId={report.id} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
