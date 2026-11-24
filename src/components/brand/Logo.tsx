import { useId } from "react";
import { cn } from "@/lib/utils";
import { BAR_SIDE, BAR_TOP, FOLD, RING, SWOOSH, TAIL, WORDMARK } from "./paths";

/** "chrome" is for dark surfaces, "ink" for light ones, "auto" follows the theme. */
export type LogoTone = "chrome" | "ink" | "auto";

const CHROME = {
  ring: ["#ffffff", "#dfe3ec", "#ffffff", "#b4bac8", "#f7f8fb", "#a6adbd"],
  bar: ["#c9ceda", "#fbfcfd", "#b0b7c6"],
  side: ["#ffffff", "#8f97aa"],
  tail: ["#e9ecf2", "#868ea1"],
  fold: ["#6e7689", "#9aa2b3"],
};
const INK = {
  ring: ["#34435f", "#1a2540", "#3f4f70", "#0f182b", "#2c3a57", "#0b1220"],
  bar: ["#1a2540", "#3f4f70", "#131c31"],
  side: ["#2c3a57", "#0b1220"],
  tail: ["#4a5a7c", "#1a2540"],
  fold: ["#050912", "#131c31"],
};

function Stops({ colors, at }: { colors: string[]; at?: number[] }) {
  return colors.map((c, i) => (
    <stop key={i} offset={at ? at[i] : i / Math.max(1, colors.length - 1)} stopColor={c} />
  ));
}

function MarkSvg({ palette, className }: { palette: typeof CHROME; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const u = (k: string) => `url(#${id}${k})`;
  return (
    <svg viewBox="0 0 650 600" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0.1" x2="0.75" y2="1">
          <Stops colors={palette.ring} at={[0, 0.2, 0.36, 0.58, 0.8, 1]} />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0.3">
          <Stops colors={palette.bar} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0.2" y2="1">
          <Stops colors={palette.side} />
        </linearGradient>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
          <Stops colors={palette.tail} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0.2" x2="1" y2="0.9">
          <stop offset="0" stopColor={palette.fold[0]} stopOpacity=".95" />
          <stop offset=".5" stopColor={palette.fold[1]} stopOpacity=".75" />
          <stop offset="1" stopColor={palette.fold[1]} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}w`} x1="0.2" y1="0" x2="0.7" y2="1">
          <Stops colors={["#ff1a28", "#ff0f1d", "#c90412"]} at={[0, 0.55, 1]} />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={RING} />
        </clipPath>
      </defs>
      <path d={TAIL} fill={u("t")} />
      <path d={RING} fill={u("r")} />
      <g clipPath={u("c")}>
        <path d={FOLD} fill={u("f")} />
      </g>
      <path d={BAR_TOP} fill={u("b")} />
      <path d={BAR_SIDE} fill={u("s")} />
      <path d={SWOOSH} fill={u("w")} />
    </svg>
  );
}

export function LogoMark({ tone = "auto", className }: { tone?: LogoTone; className?: string }) {
  const size = cn("h-9 w-auto", className);
  if (tone === "chrome") return <MarkSvg palette={CHROME} className={size} />;
  if (tone === "ink") return <MarkSvg palette={INK} className={size} />;
  return (
    <>
      <MarkSvg palette={INK} className={cn(size, "dark:hidden")} />
      <MarkSvg palette={CHROME} className={cn(size, "hidden dark:block")} />
    </>
  );
}

export function Wordmark({ tone = "auto", className }: { tone?: LogoTone; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      viewBox="10 10 572 66"
      className={cn(
        "h-4 w-auto",
        tone === "ink" && "text-ink",
        tone === "auto" && "text-ink dark:text-white",
        className,
      )}
      aria-hidden
      focusable="false"
    >
      {tone === "chrome" ? (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stops colors={["#ffffff", "#f3f5fa", "#b4bccb"]} />
          </linearGradient>
        </defs>
      ) : null}
      <path d={WORDMARK} fillRule="evenodd" fill={tone === "chrome" ? `url(#${id})` : "currentColor"} />
    </svg>
  );
}

export function Logo({
  tone = "auto",
  className,
  markClassName,
  wordClassName,
}: {
  tone?: LogoTone;
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)} role="img" aria-label="GARVHEM">
      <LogoMark tone={tone} className={markClassName} />
      <Wordmark tone={tone} className={wordClassName} />
    </span>
  );
}
