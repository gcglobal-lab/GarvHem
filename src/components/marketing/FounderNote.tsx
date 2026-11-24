import { Allison } from "next/font/google";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { FounderPortrait } from "./FounderPortrait";

const script = Allison({ subsets: ["latin"], weight: "400", display: "swap", preload: false });

export function FounderNote({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "grid items-center gap-10 [contain-intrinsic-size:auto_30rem] [content-visibility:auto] md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-20",
        className,
      )}
      data-reveal
    >
      <FounderPortrait className="max-w-sm md:max-w-none" />
      <div>
        <blockquote className="font-display text-[clamp(1.4rem,2.6vw,2.25rem)] leading-[1.28] font-medium tracking-[-0.025em] text-balance">
          <p>
            “Good people should not be out of reach because of where a company happens to be. I started
            GARVHEM so a business in Ohio or Ontario can have a full, capable team in India, and see exactly
            what that team does every single day.”
          </p>
        </blockquote>
        <figcaption className="mt-8">
          <span
            aria-hidden
            className={cn(script.className, "block text-6xl leading-none text-accent sm:text-7xl")}
          >
            {site.founder}
          </span>
          <span className="mt-4 block font-medium">{site.founder}</span>
          <span className="block text-muted">Founder and Owner, {site.name}</span>
        </figcaption>
      </div>
    </figure>
  );
}
