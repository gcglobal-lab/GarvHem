import { Check, Minus } from "lucide-react";
import { estimateSavings, formatMoney, PRICING_DISCLAIMER } from "@/config/pricing";
import { Table } from "@/components/ui/misc";

const ROWS: { label: string; local: string; garvhem: string }[] = [
  {
    label: "Recruiting",
    local: "Job ads, agency fees and your own time",
    garvhem: "Included. You meet only the shortlist",
  },
  {
    label: "Payroll and HR",
    local: "You run it, with taxes and benefits",
    garvhem: "Handled by us, in India",
  },
  { label: "Equipment and workspace", local: "You buy, set up and replace", garvhem: "Included" },
  { label: "Visibility", local: "Depends on the manager", garvhem: "Recorded hours and a report every day" },
  { label: "Contract", local: "Open-ended employment", garvhem: "Month to month, with notice" },
  {
    label: "If it does not work out",
    local: "Start the search again",
    garvhem: "Replacement with no new recruiting fee",
  },
  { label: "Who directs the work", local: "You", garvhem: "You" },
];

export function ComparisonTable() {
  const e = estimateSavings({ role: "Accountant", country: "USA", headcount: 1 });
  return (
    <div>
      <dl className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft md:hidden">
        {[
          ...ROWS,
          {
            label: "Cost of one accountant, per year",
            local: formatMoney(e.localPerHire, "USA"),
            garvhem: formatMoney(e.garvhemPerHire, "USA"),
          },
        ].map((r) => (
          <div key={r.label} className="border-b border-border p-5 last:border-0">
            <dt className="font-display font-semibold tracking-tight">{r.label}</dt>
            <dd className="mt-3 text-[15px] text-muted">
              <span className="block text-xs">Local hire</span>
              {r.local}
            </dd>
            <dd className="mt-2.5 rounded-xl bg-ink-950 px-4 py-3 text-[15px] text-white">
              <span className="block text-xs text-white/65">GARVHEM</span>
              {r.garvhem}
            </dd>
          </div>
        ))}
      </dl>
      <div className="hidden overflow-hidden rounded-3xl border border-border bg-surface shadow-soft md:block">
        <Table
          label="Local hire compared with a GARVHEM dedicated professional"
          className="min-w-[40rem] text-[15px]"
        >
          <thead>
            <tr>
              <th scope="col" className="w-[24%] px-6 py-6 text-left">
                <span className="sr-only">Topic</span>
              </th>
              <th scope="col" className="px-6 py-6 text-left text-base font-medium text-muted">
                Local hire
              </th>
              <th
                scope="col"
                className="bg-ink-950 px-6 py-6 text-left font-display text-lg font-semibold text-white"
              >
                GARVHEM
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <th scope="row" className="px-6 py-5 text-left align-top font-medium">
                  {r.label}
                </th>
                <td className="px-6 py-5 align-top text-muted">
                  <span className="flex gap-2.5">
                    <Minus className="mt-1 size-4 shrink-0 text-muted/70" aria-hidden />
                    {r.local}
                  </span>
                </td>
                <td className="bg-ink-950 px-6 py-5 align-top text-white">
                  <span className="flex gap-2.5">
                    <Check className="mt-1 size-4 shrink-0 text-signal" strokeWidth={2.5} aria-hidden />
                    {r.garvhem}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <th scope="row" className="px-6 py-6 text-left align-baseline font-medium">
                Cost of one accountant, per year
              </th>
              <td className="px-6 py-6 align-baseline font-display text-2xl font-semibold">
                {formatMoney(e.localPerHire, "USA")}
              </td>
              <td className="bg-ink-950 px-6 py-6 align-baseline font-display text-2xl font-semibold text-white">
                {formatMoney(e.garvhemPerHire, "USA")}
              </td>
            </tr>
          </tbody>
        </Table>
      </div>
      <p className="mt-4 text-[13px] text-muted">Illustrative US figures. {PRICING_DISCLAIMER}</p>
    </div>
  );
}
