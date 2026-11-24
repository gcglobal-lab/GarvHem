import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} aria-hidden />;
}

const HUES = ["#2f5bea", "#0e7f72", "#8b4fd1", "#a35d0a", "#b3264f", "#3d5a80"];
export function Avatar({ name, className }: { name: string; className?: string }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: HUES[h % HUES.length] }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (!names.length) return <span className="text-xs text-muted">Unassigned</span>;
  const extra = names.length - max;
  return (
    <span className="flex -space-x-2" title={names.join(", ")}>
      <span className="sr-only">{names.join(", ")}</span>
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} className="size-7 text-[11px] ring-2 ring-surface" />
      ))}
      {extra > 0 ? (
        <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold ring-2 ring-surface">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** Small drawn illustration instead of a blank panel. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="relative mb-5 grid h-24 w-40 place-items-center" aria-hidden>
        <svg viewBox="0 0 160 96" className="absolute inset-0 size-full text-border" fill="none">
          <path d="M18 78c22-52 92-70 126-34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M142 26c10 26-18 52-58 56"
            stroke="var(--brand)"
            strokeOpacity=".55"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="30" y="66" width="100" height="10" rx="5" fill="currentColor" opacity=".5" />
          <circle cx="24" cy="30" r="3" fill="currentColor" />
          <circle cx="134" cy="60" r="3" fill="currentColor" />
        </svg>
        <span className="relative grid size-14 place-items-center rounded-2xl border border-border bg-surface shadow-soft">
          <Icon className="size-6 text-muted" />
        </span>
      </div>
      <p className="font-display text-[15px] font-semibold tracking-tight">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Progress({
  value,
  className,
  tone = "accent",
  label,
}: {
  value: number;
  className?: string;
  tone?: "accent" | "danger" | "success";
  label: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", {
          "bg-accent": tone === "accent",
          "bg-danger": tone === "danger",
          "bg-success": tone === "success",
        })}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/* Tables scroll sideways inside their own box, never the page. */
export function Table({ className, label, ...props }: ComponentProps<"table"> & { label: string }) {
  return (
    <div className="relative scrollbar-thin overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}
export const Th = ({ className, ...props }: ComponentProps<"th">) => (
  <th
    scope="col"
    className={cn(
      "border-b border-border px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted",
      className,
    )}
    {...props}
  />
);
export const Td = ({ className, ...props }: ComponentProps<"td">) => (
  <td className={cn("border-b border-border/70 px-4 py-3 align-middle", className)} {...props} />
);
