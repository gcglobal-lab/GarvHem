import { ScrollText } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  type: { name: string; color: string };
  delta: number;
  kind: string;
  reason: string;
  actor: string;
  createdAt: string;
};
const KIND: Record<string, { label: string; tone: BadgeTone }> = {
  ALLOCATION: { label: "Allocation", tone: "success" },
  ACCRUAL: { label: "Accrual", tone: "success" },
  CARRY_FORWARD: { label: "Carry forward", tone: "success" },
  DEDUCTION: { label: "Deduction", tone: "warning" },
  REVERSAL: { label: "Reversal", tone: "accent" },
  ADJUSTMENT: { label: "Adjustment", tone: "neutral" },
};

export function LedgerTable({ entries, timezone }: { entries: Entry[]; timezone: string }) {
  if (!entries.length) return <EmptyState icon={ScrollText} title="No ledger entries this year" />;
  return (
    <Table label="Leave ledger">
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Type</Th>
          <Th>Entry</Th>
          <Th className="text-right">Days</Th>
          <Th>Reason</Th>
          <Th>By</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <Td className="tabular text-xs whitespace-nowrap text-muted">
              {formatDateTime(e.createdAt, timezone)}
            </Td>
            <Td className="whitespace-nowrap">
              <span
                className="mr-2 inline-block size-2.5 rounded-full"
                style={{ background: e.type.color }}
                aria-hidden
              />
              {e.type.name}
            </Td>
            <Td>
              <Badge tone={KIND[e.kind]?.tone}>{KIND[e.kind]?.label ?? e.kind}</Badge>
            </Td>
            <Td
              className={cn("tabular text-right font-semibold", e.delta < 0 ? "text-danger" : "text-success")}
            >
              {e.delta > 0 ? "+" : ""}
              {e.delta}
            </Td>
            <Td className="min-w-48">{e.reason}</Td>
            <Td className="whitespace-nowrap text-muted">{e.actor}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
