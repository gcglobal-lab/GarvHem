import { media } from "@/config/media";
import { site } from "@/config/site";
import { cn, initials } from "@/lib/utils";
import { MediaFrame } from "./MediaFrame";
import { Slashes } from "./Slashes";

export function FounderPortrait({ className }: { className?: string }) {
  return (
    <MediaFrame
      asset={media.founder.photo}
      sizes="(min-width: 1024px) 420px, 100vw"
      className={cn("aspect-4/5", className)}
    >
      <div
        role="img"
        aria-label={`Portrait placeholder for ${site.founder}`}
        className={cn(
          "dark relative grid aspect-4/5 place-items-center overflow-hidden rounded-3xl bg-ink-950",
          className,
        )}
      >
        <Slashes />
        <span
          aria-hidden
          className="text-chrome relative pr-[0.08em] font-display text-[clamp(5rem,12vw,9rem)] font-semibold tracking-[-0.06em]"
        >
          {initials(site.founder)}
        </span>
      </div>
    </MediaFrame>
  );
}
