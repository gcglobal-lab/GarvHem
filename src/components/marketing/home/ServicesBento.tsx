import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { flagship, services, type Service } from "@/config/services";
import { cn } from "@/lib/utils";
import { SERVICE_ICONS } from "../icons";
import { Slashes } from "../Slashes";

/** Seven services: one flagship, five standard, one invitation. Sizes follow importance. */
export function ServicesBento() {
  const standard = services.filter((s) => s.slug !== flagship.slug && s.slug !== "custom-requirements");
  const custom = services.find((s) => s.slug === "custom-requirements")!;
  const FlagIcon = SERVICE_ICONS[flagship.icon];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      <li className="sm:col-span-2" data-reveal="0">
        <Link
          href={`/services/${flagship.slug}`}
          className="dark group relative flex h-full min-h-84 flex-col overflow-hidden rounded-3xl bg-ink-950 p-7 text-white transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-10"
        >
          <Slashes />
          <FlagIcon className="relative size-8" strokeWidth={1.75} aria-hidden />
          <span className="relative mt-auto flex flex-col gap-6 pt-16 lg:flex-row lg:items-end lg:justify-between">
            <span className="block max-w-lg">
              <span className="block font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {flagship.name}
              </span>
              <span className="mt-3 block text-[17px] leading-relaxed text-white/80">{flagship.summary}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 font-medium">
              Explore
              <ArrowRight
                className="size-5 transition-transform duration-300 group-hover:translate-x-1.5"
                aria-hidden
              />
            </span>
          </span>
        </Link>
      </li>
      {standard.map((s, i) => (
        <li key={s.slug} data-reveal={String((i + 1) % 3)}>
          <ServiceCard service={s} />
        </li>
      ))}
      <li className="lg:col-span-2" data-reveal="2">
        <Link
          href={`/services/${custom.slug}`}
          className="group flex h-full flex-col justify-between gap-10 rounded-3xl border-2 border-dashed border-input p-7 transition-colors duration-300 hover:border-brand sm:p-8"
        >
          <span className="font-display text-2xl leading-tight font-semibold tracking-tight">
            {custom.headline}
          </span>
          <span className="flex items-end justify-between gap-4 text-[15px] text-muted">
            We will say honestly whether we can do it.
            <ArrowUpRight
              className="size-6 shrink-0 text-brand transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </span>
        </Link>
      </li>
    </ul>
  );
}

function ServiceCard({ service, className }: { service: Service; className?: string }) {
  const Icon = SERVICE_ICONS[service.icon];
  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-3xl border border-border bg-surface p-7 transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-lift sm:p-8",
        className,
      )}
    >
      <span className="flex items-start justify-between">
        <Icon className="size-7 text-foreground" strokeWidth={1.75} aria-hidden />
        <ArrowUpRight
          className="size-5 text-muted transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
          aria-hidden
        />
      </span>
      <span className="mt-7 font-display text-xl font-semibold tracking-tight sm:mt-12">{service.name}</span>
      <span className="mt-2 text-[15px] leading-relaxed text-muted">{service.summary}</span>
    </Link>
  );
}
