"use client";

import { ArrowRight, Minus, Plus, UserRound } from "lucide-react";
import { useDeferredValue, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import {
  estimateSavings,
  formatMoney,
  MAX_HEADCOUNT,
  ON_COST_NOTE,
  PRICING_COUNTRIES,
  PRICING_COUNTRY_NAMES,
  PRICING_DISCLAIMER,
  PRICING_ROLE_NAMES,
  type PricingCountry,
  type PricingRole,
} from "@/config/pricing";
import { cn } from "@/lib/utils";
import { QuoteLink } from "../quote/QuoteLink";
import { Slashes } from "../Slashes";
import { useTween } from "./use-tween";

export function SavingsCalculator({
  variant = "full",
  className,
}: {
  variant?: "mini" | "full";
  className?: string;
}) {
  const id = useId();
  const [role, setRole] = useState<PricingRole>("Accountant");
  const [country, setCountry] = useState<PricingCountry>("USA");
  const [headcount, setHeadcount] = useState(1);
  const e = estimateSavings({ role, country, headcount });

  const local = useTween(e.localTotal);
  const garvhem = useTween(e.garvhemTotal);
  const savings = useTween(e.savings);
  const money = (n: number) => formatMoney(Math.round(n), country);
  const people = headcount === 1 ? "1 person" : `${headcount} people`;

  const summary = useDeferredValue(
    `${role}, ${PRICING_COUNTRIES[country].label}, ${people}. Estimated local cost ${formatMoney(e.localTotal, country)} a year, GARVHEM ${formatMoney(e.garvhemTotal, country)} a year. Estimated saving ${formatMoney(e.savings, country)}, ${e.savingsPercent} percent. ${e.professionalsForOne} professionals for the price of 1.`,
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-border bg-surface shadow-lift",
        variant === "full"
          ? "grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          : "grid grid-cols-1",
        className,
      )}
    >
      <form
        className={cn(
          "p-6 sm:p-8",
          variant === "full" ? "flex flex-col gap-7 lg:p-10" : "grid gap-5 sm:grid-cols-2",
        )}
        aria-label="Savings calculator"
        onSubmit={(ev) => ev.preventDefault()}
      >
        <Field label="Role">
          <Select
            className="[&_select]:h-12 [&_select]:text-[15px]"
            value={role}
            onChange={(ev) => setRole(ev.target.value as PricingRole)}
          >
            {PRICING_ROLE_NAMES.map((r) => (
              <option key={r} value={r}>
                {r === "Custom" ? "Custom role" : r}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="min-w-0">
          <legend className="text-[13px] font-medium">Where you hire today</legend>
          <div className="mt-1.5 grid h-12 grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {PRICING_COUNTRY_NAMES.map((c) => (
              <label
                key={c}
                className="grid cursor-pointer place-items-center rounded-lg text-sm font-medium text-muted transition-colors has-checked:bg-surface has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name={`${id}-place`}
                  className="sr-only"
                  checked={country === c}
                  onChange={() => setCountry(c)}
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={variant === "mini" ? "sm:col-span-2" : undefined}>
          <label htmlFor={`${id}-count`} className="text-[13px] font-medium">
            How many people
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="One fewer"
              disabled={headcount <= 1}
              onClick={() => setHeadcount((n) => Math.max(1, n - 1))}
            >
              <Minus aria-hidden />
            </Button>
            <input
              id={`${id}-count`}
              type="range"
              min={1}
              max={variant === "mini" ? 10 : 20}
              value={Math.min(headcount, variant === "mini" ? 10 : 20)}
              onChange={(ev) => setHeadcount(Number(ev.target.value))}
              aria-valuetext={people}
              className="h-10 min-w-0 flex-1 accent-brand"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="One more"
              disabled={headcount >= MAX_HEADCOUNT}
              onClick={() => setHeadcount((n) => Math.min(MAX_HEADCOUNT, n + 1))}
            >
              <Plus aria-hidden />
            </Button>
            <span aria-hidden className="w-9 text-right font-display text-2xl font-semibold">
              {headcount}
            </span>
          </div>
        </div>

        {variant === "full" ? (
          <dl className="mt-auto space-y-3 border-t border-border pt-6 text-sm">
            <Row label="One local hire, per year" value={formatMoney(e.localPerHire, country)} />
            <Row label="One GARVHEM professional, per year" value={formatMoney(e.garvhemPerHire, country)} />
            <Row
              label="GARVHEM monthly rate, per person"
              value={formatMoney(e.garvhemPerHire / 12, country)}
              strong
            />
          </dl>
        ) : null}
      </form>

      <div
        className={cn(
          "dark relative overflow-hidden bg-ink-950 p-6 text-foreground sm:p-8",
          variant === "full" && "lg:p-10",
        )}
      >
        <Slashes variant="quiet" />
        <div className="relative">
          <div className="flex items-end gap-4">
            <p
              className="font-display text-7xl leading-none font-semibold tracking-[-0.05em] sm:text-8xl"
              data-testid="professionals"
            >
              {e.professionalsForOne}
            </p>
            <p className="pb-1.5 text-[15px] leading-snug sm:pb-2.5 sm:text-lg">
              professionals for the
              <br />
              price of 1 local hire
            </p>
          </div>

          <div className="mt-5 flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <Person key={i} fill={Math.max(0, Math.min(1, e.ratio - i))} />
            ))}
            <span className="ml-2 text-[13px] text-muted">{e.ratio.toFixed(1)} times the capacity</span>
          </div>

          <div className="mt-8 space-y-5">
            <Bar label={`Local, ${people}`} value={money(local)} width={100} className="bg-white/35" />
            <Bar
              label={`GARVHEM, ${people}`}
              value={money(garvhem)}
              width={(e.garvhemTotal / e.localTotal) * 100}
              className="bg-brand"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5 border-t border-white/12 pt-6">
            <div>
              <p className="text-[13px] text-muted">Estimated saving per year</p>
              <p className="tabular mt-1 flex flex-wrap items-baseline gap-x-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {money(savings)}
                <span className="font-sans text-base font-semibold tracking-normal text-success">
                  {e.savingsPercent}% less
                </span>
              </p>
            </div>
            <Button asChild variant="brand" size="lg">
              <QuoteLink service="Dedicated Talent" role={role === "Custom" ? undefined : role}>
                Get an exact quote
                <ArrowRight aria-hidden />
              </QuoteLink>
            </Button>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            <strong className="font-medium text-foreground">{PRICING_DISCLAIMER}</strong> Figures are
            illustrative
            {country === "Canada" ? " and shown in Canadian dollars" : " and shown in US dollars"}.{" "}
            {ON_COST_NOTE}
          </p>
        </div>
        <p className="sr-only" role="status">
          {summary}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-medium" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular shrink-0", strong ? "font-display text-lg font-semibold" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}

function Bar({
  label,
  value,
  width,
  className,
}: {
  label: string;
  value: string;
  width: number;
  className: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-medium">{value}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", className)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/** A person icon filled from the left: 0.6 = 60% of one more person. */
function Person({ fill }: { fill: number }) {
  return (
    <span className="relative size-9">
      <UserRound className="absolute inset-0 size-9 text-white/20" strokeWidth={1.75} />
      <span
        className="absolute inset-0 transition-[clip-path] duration-500 ease-out"
        style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}
      >
        <UserRound className="size-9 text-signal" strokeWidth={2} />
      </span>
    </span>
  );
}
