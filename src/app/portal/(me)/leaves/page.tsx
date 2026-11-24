import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ApplyLeaveButton, CancelLeaveButton } from "@/components/portal/leave-forms";
import { LeaveBalances } from "@/components/portal/leave-balances";
import { LedgerTable } from "@/components/portal/ledger-table";
import { PageHeader } from "@/components/portal/page-header";
import { LeaveStatusBadge } from "@/components/portal/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { formatISODate, workDateOf, yearOf } from "@/lib/time";
import { ledgerFor, ownLeaves, userBalances } from "@/server/leaves";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Leaves" };

export default async function LeavesPage() {
  const user = await requirePagePermission("own.leaves");
  const { company } = await getSettings();
  const today = workDateOf(new Date(), company.timezone);
  const year = yearOf(today);
  const [balances, requests, ledger] = await Promise.all([
    userBalances(user.id, year),
    ownLeaves(user.id),
    ledgerFor(user.id, year),
  ]);

  return (
    <>
      <PageHeader
        title="Leaves"
        description={`Your balance for ${year}, worked out from the ledger below.`}
        actions={<ApplyLeaveButton balances={balances} today={today} />}
      />
      <div className="space-y-5">
        <Card>
          <CardHeader title="Balance" />
          <CardBody className="[&>ul]:xl:grid-cols-4">
            <LeaveBalances balances={balances} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Requests" />
          <CardBody className="px-0 pb-2">
            {requests.length ? (
              <Table label="Leave requests">
                <thead>
                  <tr>
                    {["Type", "Dates", "Days", "Reason", "Status", "Note", ""].map((h, i) => (
                      <Th key={i}>{h || <span className="sr-only">Actions</span>}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const future = r.from > today;
                    const canCancel = r.status === "PENDING" || (r.status === "APPROVED" && future);
                    return (
                      <tr key={r.id}>
                        <Td className="font-medium whitespace-nowrap">
                          <span
                            className="mr-2 inline-block size-2.5 rounded-full"
                            style={{ background: r.type.color }}
                            aria-hidden
                          />
                          {r.type.name}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {formatISODate(r.from, "d MMM yyyy")}
                          {r.to !== r.from ? ` to ${formatISODate(r.to, "d MMM yyyy")}` : ""}
                          {r.firstHalfDay || r.lastHalfDay ? (
                            <span className="text-xs text-muted"> (half day)</span>
                          ) : null}
                        </Td>
                        <Td className="tabular">{r.days}</Td>
                        <Td className="max-w-64 min-w-40">{r.reason}</Td>
                        <Td>
                          <LeaveStatusBadge status={r.status} />
                        </Td>
                        <Td className="max-w-56 text-xs text-muted">
                          {r.decisionNote ?? ""}
                          {r.approver ? <span className="block">By {r.approver}</span> : null}
                        </Td>
                        <Td className="text-right">
                          {canCancel ? (
                            <CancelLeaveButton id={r.id} approved={r.status === "APPROVED"} />
                          ) : null}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No requests yet"
                description="When you apply for leave, it will be listed here."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ledger" description="Every credit and deduction, newest first." />
          <CardBody className="px-0 pb-2">
            <LedgerTable entries={ledger} timezone={company.timezone} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
