import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./layout-parts";
import { breadcrumbData, JsonLd } from "./seo";
import { Slashes } from "./Slashes";

export function PageHeader({
  title,
  intro,
  crumbs,
  actions,
  aside,
  compact,
}: {
  title: ReactNode;
  intro?: ReactNode;
  /** Trail without "Home"; the last entry is the current page. */
  crumbs: { name: string; path: string }[];
  actions?: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) {
  const trail = [{ name: "Home", path: "/" }, ...crumbs];
  return (
    <header className="dark relative overflow-hidden bg-ink-950 text-white">
      <Slashes variant="header" />
      <Container
        className={cn(
          "relative pt-32 sm:pt-40",
          compact ? "pb-14 sm:pb-16" : "pb-20 sm:pb-24 lg:pb-28",
          aside && "grid items-center gap-14 lg:grid-cols-12 lg:gap-12",
        )}
      >
        <div className={aside ? "lg:col-span-7" : "max-w-5xl"}>
          <nav aria-label="Breadcrumb" className="mb-7 text-[13px] text-white/70">
            <ol className="flex flex-wrap items-center gap-1.5">
              {trail.map((c, i) => (
                <li key={c.path} className="flex items-center gap-1.5">
                  {i > 0 ? <ChevronRight className="size-3.5 text-white/40" aria-hidden /> : null}
                  {i === trail.length - 1 ? (
                    <span aria-current="page">{c.name}</span>
                  ) : (
                    <Link href={c.path} className="rounded hover:text-white hover:underline">
                      {c.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.05] font-semibold tracking-[-0.035em]">
            {title}
          </h1>
          {intro ? (
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-white/80 sm:text-xl">{intro}</p>
          ) : null}
          {actions ? (
            <div className="mt-9 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:flex-wrap">
              {actions}
            </div>
          ) : null}
        </div>
        {aside ? <div className="lg:col-span-5">{aside}</div> : null}
      </Container>
      <JsonLd data={breadcrumbData(trail)} />
    </header>
  );
}
