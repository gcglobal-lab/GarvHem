import Image from "next/image";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { media } from "@/config/media";

/** Left half of the login card: the configured photo, or a drawn scene in the brand's light. */
export function AuthArt() {
  return (
    <div className="relative hidden min-h-[36rem] overflow-hidden bg-ink-950 text-white md:flex md:flex-col md:justify-between md:p-10">
      {media.login.image ? (
        <Image
          src={media.login.image}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 500px, 0px"
          className="object-cover"
        />
      ) : (
        <>
          <div
            className="grid-lines absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]"
            aria-hidden
          />
          <div
            className="absolute -top-24 -left-24 size-96 rounded-full bg-[#1d4ed8]/35 blur-3xl"
            aria-hidden
          />
          <svg
            viewBox="0 0 500 640"
            className="absolute inset-0 size-full"
            preserveAspectRatio="xMaxYMax slice"
            aria-hidden
          >
            <defs>
              <linearGradient id="auth-blade" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#ff2233" stopOpacity="0" />
                <stop offset=".55" stopColor="#e00b1c" stopOpacity=".55" />
                <stop offset="1" stopColor="#ff2233" stopOpacity=".9" />
              </linearGradient>
            </defs>
            <path d="M500 250 160 640h110L500 376Z" fill="#0a1328" />
            <path d="M500 372 262 640h14L500 388Z" fill="url(#auth-blade)" />
            <path d="M500 470 348 640h110L500 592Z" fill="url(#auth-blade)" opacity=".5" />
          </svg>
          <LogoMark
            tone="chrome"
            className="absolute top-1/2 left-1/2 h-56 -translate-x-1/2 -translate-y-[58%] drop-shadow-[0_24px_60px_rgb(29_78_216/0.45)]"
          />
        </>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-ink-950/40"
        aria-hidden
      />
      <Logo tone="chrome" className="relative" />
      <div className="relative">
        <p className="max-w-xs font-display text-2xl leading-snug font-semibold tracking-tight">
          One place for your day, your team and your work.
        </p>
        <p className="mt-2 max-w-xs text-sm text-white/70">
          Attendance, leave, tasks and daily reports for the GARVHEM team.
        </p>
      </div>
    </div>
  );
}

/** Centered, elevated card split in two: picture on the left, form on the right. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full max-w-[1000px] overflow-hidden rounded-3xl border border-border bg-surface shadow-lift md:grid-cols-2">
      <AuthArt />
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <Logo className="mb-10 md:hidden" />
        {children}
      </div>
    </div>
  );
}
