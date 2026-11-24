"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { api } from "@/lib/client-api";
import { formatMinutes, formatTime } from "@/lib/time";
import type { BoardEntry } from "@/server/attendance";
import { usePortal } from "./providers";
import { BOARD_STATUS } from "./status";

const ORDER: BoardEntry["status"][] = ["WORKING", "ON_LUNCH", "NOT_IN", "ON_LEAVE", "OUT", "OFF"];

/** Who is in right now. Refreshes every 30 seconds. */
export function LiveBoard({ initial, today }: { initial: BoardEntry[]; today: string }) {
  const { timezone } = usePortal();
  const { data } = useQuery({
    queryKey: ["live-board"],
    queryFn: () => api<BoardEntry[]>("/api/portal/admin/board"),
    initialData: initial,
    refetchInterval: 30_000,
  });
  if (!data.length) return <EmptyState icon={Users} title="No one in your team yet" />;
  const sorted = [...data].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name),
  );
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {sorted.map((p) => {
        const s = BOARD_STATUS[p.status];
        return (
          <li key={p.userId}>
            <Link
              href={`/portal/admin/attendance/${p.userId}/${today}`}
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-input hover:bg-surface-2/50"
            >
              <Avatar name={p.name} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <Badge tone={s.tone} className="ml-auto">
                    {s.label}
                  </Badge>
                </span>
                <span className="tabular mt-0.5 block truncate text-xs text-muted">
                  {p.firstIn
                    ? `In ${formatTime(p.firstIn, timezone)}${p.isLate ? " (late)" : ""}, ${formatMinutes(p.netMinutes)} net, lunch ${p.lunchMinutes}m${p.status === "OUT" ? `, out ${formatTime(p.lastOut, timezone)}` : ""}`
                    : (p.designation ?? "")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
