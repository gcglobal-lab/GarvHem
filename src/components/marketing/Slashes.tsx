import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Brand backdrop for dark areas: deep blue glow, a navy slab and red light on 45 degree cuts,
 * taken from the GARVHEM banner. Decorative, pure SVG.
 */
export function Slashes({
  variant = "header",
  className,
}: {
  variant?: "header" | "band" | "quiet";
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const u = (k: string) => `url(#${id}${k})`;
  const red = variant !== "quiet";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <svg
        viewBox="0 0 1440 640"
        preserveAspectRatio="xMaxYMax slice"
        className="absolute inset-0 size-full max-sm:top-auto max-sm:h-88 max-sm:mask-t-from-50%"
        focusable="false"
      >
        <defs className="text-blue-700">
          <radialGradient id={`${id}g`} cx="0.76" cy="0.3" r="0.72">
            <stop offset="0" stopColor="currentColor" stopOpacity=".34" />
            <stop offset=".45" stopColor="currentColor" stopOpacity=".12" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}s`} x1="1180" y1="0" x2="640" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity=".26" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}b`} x1="1120" y1="220" x2="700" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset=".6" stopColor="currentColor" stopOpacity=".7" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <defs className="text-signal">
          <linearGradient id={`${id}l`} x1="1500" y1="190" x2="1050" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity=".25" />
            <stop offset=".45" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id={`${id}m`} x1="1440" y1="0" x2="1160" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity=".95" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}q`} cx="1410" cy="40" r="220" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity=".26" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <defs className="text-brand-strong">
          <radialGradient id={`${id}r`} cx="1290" cy="400" r="330" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" stopOpacity=".5" />
            <stop offset=".45" stopColor="currentColor" stopOpacity=".26" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".04" />
          </radialGradient>
        </defs>
        <rect width="1440" height="640" fill={u("g")} />
        <path d="M980 0h330L670 640H340Z" fill={u("s")} className={red ? undefined : "max-sm:hidden"} />
        {red ? (
          <>
            <path d="M1120 220 700 640" stroke={u("b")} strokeWidth="1.2" />
            <path d="M1440 0v240l-120 120-120-120Z" fill={u("q")} />
            <path d="M1440 0 1160 280" stroke={u("m")} strokeWidth="2" />
            <path d="M1440 250v390h-390Z" className="fill-ink-950/85" />
            <path d="M1440 250v390h-390Z" fill={u("r")} />
            <path d="M1440 250 1050 640" stroke={u("l")} strokeWidth="2.2" />
            {variant === "band" ? (
              <path d="M1310 250 920 640" stroke={u("l")} strokeWidth="1.2" opacity=".5" />
            ) : null}
          </>
        ) : null}
      </svg>
    </div>
  );
}
