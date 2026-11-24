import { Ring } from "@/components/portal/charts";
import type { TypeBalance } from "@/server/leaves";

const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** One ring per leave type: the ring shows what is left, the list shows the full account. */
export function LeaveBalances({ balances }: { balances: TypeBalance[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {balances.map((b) => (
        <li key={b.typeId} className="flex items-center gap-4">
          <Ring
            value={b.isUnlimited ? 1 : b.remaining}
            total={b.isUnlimited ? 1 : b.allotted}
            stroke={b.color}
            label={
              b.isUnlimited
                ? `${b.name}: no limit, ${n(b.used)} used`
                : `${b.name}: ${n(b.remaining)} of ${n(b.allotted)} days left`
            }
            className="size-[84px] shrink-0"
          >
            <span className="tabular font-display text-xl font-semibold">
              {b.isUnlimited ? n(b.used) : n(b.remaining)}
            </span>
            <span className="text-[10px] text-muted">{b.isUnlimited ? "used" : "left"}</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{b.name}</p>
            <dl className="tabular mt-1 grid grid-cols-[auto_auto] gap-x-3 text-xs text-muted">
              <dt>Allotted</dt>
              <dd className="text-right text-foreground">{b.isUnlimited ? "No limit" : n(b.allotted)}</dd>
              <dt>Used</dt>
              <dd className="text-right text-foreground">{n(b.used)}</dd>
              <dt>Pending</dt>
              <dd className="text-right text-foreground">{n(b.pending)}</dd>
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
