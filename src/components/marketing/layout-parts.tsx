import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[80rem] px-5 min-[1800px]:max-w-[94rem] sm:px-8", className)}
      {...props}
    />
  );
}

export function Section({
  tone = "white",
  className,
  children,
  ...props
}: ComponentProps<"section"> & { tone?: "white" | "canvas" | "ink" }) {
  return (
    <section
      className={cn(
        "relative py-20 sm:py-28 lg:py-32",
        tone === "canvas" && "bg-canvas",
        tone === "ink" && "dark overflow-hidden bg-ink-950 text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function H2({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-[clamp(1.9rem,3.7vw,3.15rem)] leading-[1.08] font-semibold tracking-[-0.03em]",
        className,
      )}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-[17px] leading-relaxed text-muted sm:text-lg", className)} {...props} />;
}

/** Heading on the left, supporting text on the right. Stacks on small screens. */
export function SplitHeading({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10", className)} data-reveal>
      <H2 className="lg:col-span-7">{title}</H2>
      {children ? <Lead className="lg:col-span-5">{children}</Lead> : null}
    </div>
  );
}

/** The diagonal cut from the logo artwork, used as a list marker. */
export function SlashMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-3.5 w-1 shrink-0 -skew-x-[24deg] rounded-[1px] bg-brand", className)}
    />
  );
}
