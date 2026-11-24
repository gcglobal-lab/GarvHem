"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Chart kit. Fixed colour order (--chart-1..5, validated for colour blindness in both modes), one axis,
 * thin marks, hover on every mark, legend for two or more series, and a table for every chart.
 */
export type Series = { key: string; label: string; color: 1 | 2 | 3 | 4 | 5 };
type Row = Record<string, string | number>;

const color = (n: number) => `var(--chart-${n})`;
const tick = { fill: "var(--muted)", fontSize: 12 };

function TooltipBox({
  active,
  label,
  payload,
  series,
  unit,
}: {
  active?: boolean;
  label?: ReactNode;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  series: Series[];
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium">{label}</p>
      {series.map((s) => {
        const value = payload.find((p) => p.dataKey === s.key)?.value;
        return (
          <p key={s.key} className="flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full" style={{ background: color(s.color) }} aria-hidden />
            {s.label}
            <span className="tabular ml-auto pl-4 font-semibold text-foreground">
              {String(value ?? 0)}
              {unit ? ` ${unit}` : ""}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function Frame({
  data,
  series,
  xKey,
  unit,
  label,
  height,
  children,
}: {
  data: Row[];
  series: Series[];
  xKey: string;
  unit?: string;
  label: string;
  height: number;
  children: ReactNode;
}) {
  return (
    <figure className="min-w-0">
      {series.length > 1 ? (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: color(s.color) }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ height }} role="img" aria-label={label}>
        {children}
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="w-fit cursor-pointer hover:text-foreground">View as table</summary>
        <div
          className="mt-2 max-h-56 scrollbar-thin overflow-auto"
          tabIndex={0}
          role="region"
          aria-label={`${label}, table`}
        >
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-3 text-left font-medium">
                  <span className="sr-only">Item</span>
                </th>
                {series.map((s) => (
                  <th scope="col" key={s.key} className="py-1 pr-3 text-right font-medium">
                    {s.label}
                    {unit ? ` (${unit})` : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {data.map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <th scope="row" className="py-1 pr-3 text-left font-normal">
                    {r[xKey]}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 pr-3 text-right text-foreground">
                      {r[s.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

type Common = { data: Row[]; xKey: string; series: Series[]; unit?: string; label: string; height?: number };

/** Vertical bars. Two or more series stack, with a surface gap between segments. */
export function Columns({ height = 220, ...p }: Common) {
  return (
    <Frame {...p} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={p.data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey={p.xKey} tickLine={false} axisLine={false} tick={tick} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} width={48} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
            content={({ active, label, payload }) => (
              <TooltipBox active={active} label={label} payload={payload} series={p.series} unit={p.unit} />
            )}
          />
          {p.series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={color(s.color)}
              maxBarSize={26}
              stroke="var(--surface)"
              strokeWidth={p.series.length > 1 ? 1.5 : 0}
              radius={i === p.series.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

/** Horizontal bars for named things, with the value printed at the end. */
export function Rows({ height, ...p }: Common) {
  const h = height ?? Math.max(120, p.data.length * 38 + 16);
  const single = p.series.length === 1;
  return (
    <Frame {...p} height={h}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={p.data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          accessibilityLayer
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey={p.xKey} tickLine={false} axisLine={false} tick={tick} width={118} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
            content={({ active, label, payload }) => (
              <TooltipBox active={active} label={label} payload={payload} series={p.series} unit={p.unit} />
            )}
          />
          {p.series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={color(s.color)}
              maxBarSize={18}
              stroke="var(--surface)"
              strokeWidth={single ? 0 : 1.5}
              radius={i === p.series.length - 1 ? [0, 4, 4, 0] : 0}
              isAnimationActive={false}
            >
              {single ? (
                <LabelList dataKey={s.key} position="right" fill="var(--foreground)" fontSize={12} />
              ) : null}
              {single ? p.data.map((_, j) => <Cell key={j} fill={color(s.color)} />) : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function Lines({ height = 220, ...p }: Common) {
  return (
    <Frame {...p} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={p.data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey={p.xKey} tickLine={false} axisLine={false} tick={tick} minTickGap={28} />
          <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} width={48} />
          <Tooltip
            cursor={{ stroke: "var(--input)" }}
            content={({ active, label, payload }) => (
              <TooltipBox active={active} label={label} payload={payload} series={p.series} unit={p.unit} />
            )}
          />
          {p.series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              stroke={color(s.color)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

/** Share of one total, e.g. used leave. The number in the middle carries the value. */
export function Ring({
  value,
  total,
  stroke,
  label,
  children,
  className,
}: {
  value: number;
  total: number;
  stroke: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const share = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div className={cn("relative size-24", className)} role="img" aria-label={label}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        {share > 0 ? (
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${c * share} ${c}`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center" aria-hidden>
        {children}
      </div>
    </div>
  );
}
