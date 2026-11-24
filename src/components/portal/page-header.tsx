import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted">{label}</span>
        {Icon ? (
          <span className={cn("grid size-8 place-items-center rounded-lg", TONES[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="tabular mt-1 block font-display text-xl leading-tight font-semibold tracking-tight sm:text-[28px]">
        {value}
      </span>
      {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
    </>
  );
  const classes = "block rounded-card border border-border bg-surface p-4 shadow-soft";
  return href ? (
    <Link
      href={href}
      className={cn(classes, "transition-[border-color,box-shadow] hover:border-input hover:shadow-lift")}
    >
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
