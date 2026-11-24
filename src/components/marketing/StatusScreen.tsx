import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Slashes } from "./Slashes";

/** Full-page branded status: 404 and errors. Neutral, so it also suits the portal. */
export function StatusScreen({
  code,
  title,
  text,
  children,
}: {
  code: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <main className="dark relative flex min-h-svh flex-col overflow-hidden bg-ink-950 text-white">
      <Slashes variant="band" />
      <div className="relative mx-auto flex w-full max-w-[80rem] flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
        <Link href="/" aria-label="GARVHEM home" className="self-start rounded-lg">
          <Logo tone="chrome" markClassName="h-9" wordClassName="h-3.5" />
        </Link>
        <div className="my-auto max-w-xl py-16">
          <p
            aria-hidden
            className="text-chrome font-display text-[clamp(6rem,18vw,13rem)] leading-[0.9] font-semibold tracking-[-0.04em]"
          >
            {code}
          </p>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/80">{text}</p>
          <div className="mt-9 flex flex-wrap gap-3">{children}</div>
        </div>
      </div>
    </main>
  );
}
