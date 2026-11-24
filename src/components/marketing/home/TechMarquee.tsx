"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TECH = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "PostgreSQL",
  "AWS",
  "Microsoft Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Terraform",
  "QuickBooks",
  "Xero",
  "Shopify",
  "WordPress",
  "Microsoft 365",
  "Google Workspace",
  "Excel",
  "Jira",
];

/** Names only, no logos. Pauses on hover, focus and with the button; static and wrapped with reduced motion. */
export function TechMarquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="relative">
      <div className="overflow-hidden mask-x-from-90% motion-reduce:mask-none">
        <div
          className={cn(
            "flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none",
            paused && "[animation-play-state:paused]",
          )}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1 || undefined}
              className={cn(
                "flex shrink-0 items-center motion-reduce:mx-auto motion-reduce:max-w-[80rem] motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:gap-y-4 motion-reduce:px-5 motion-reduce:sm:px-8",
                copy === 1 && "motion-reduce:hidden",
              )}
            >
              {TECH.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-8 pr-8 font-display text-2xl font-semibold tracking-tight whitespace-nowrap text-foreground/80 sm:text-3xl"
                >
                  {t}
                  <span aria-hidden className="h-6 w-0.5 -skew-x-[24deg] bg-brand" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="mx-auto mt-8 flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-foreground motion-reduce:hidden"
      >
        {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        {paused ? "Resume scrolling" : "Pause scrolling"}
      </button>
    </div>
  );
}
