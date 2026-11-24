"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { INK_BLUR, media } from "@/config/media";
import { cn } from "@/lib/utils";

type Connection = { saveData?: boolean; effectiveType?: string };

/**
 * Poster first (it is the LCP image), video after the page has settled. The video is never mounted with
 * reduced motion, data saver, a 2G/3G connection or no configured file, and it goes away if it fails.
 */
export function HeroVideo() {
  const { video, poster } = media.hero;
  const ref = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (reduced.matches || connection?.saveData || /2g|3g/.test(connection?.effectiveType ?? "")) return;
    const start = () => setMounted(true);
    const onChange = () => reduced.matches && setMounted(false);
    reduced.addEventListener("change", onChange);
    let timer = 0;
    const schedule = () => (timer = window.setTimeout(start, 300));
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      reduced.removeEventListener("change", onChange);
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
    };
  }, [video]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setMounted(false));
    else el.pause();
  }

  const fit = "object-cover object-[70%_50%]";
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-950">
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
          placeholder="blur"
          blurDataURL={INK_BLUR}
          className={fit}
        />
      ) : null}
      {mounted && video ? (
        <video
          ref={ref}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster ?? undefined}
          tabIndex={-1}
          aria-hidden
          onPlaying={() => {
            setPlaying(true);
            setVisible(true);
          }}
          onPause={() => setPlaying(false)}
          onError={() => setMounted(false)}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-700",
            fit,
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          {video.webm ? <source src={video.webm} type="video/webm" /> : null}
          <source src={video.mp4} type="video/mp4" onError={() => setMounted(false)} />
        </video>
      ) : null}
      <div aria-hidden className="absolute inset-0 bg-ink-950/45 sm:hidden" />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-ink-950 via-ink-950/70 via-40% to-transparent to-75%"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-ink-950/90 to-transparent"
      />
      {mounted && visible ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause background video" : "Play background video"}
          className="absolute right-5 bottom-5 z-10 grid size-11 place-items-center rounded-full border border-white/20 bg-ink-950/60 text-white backdrop-blur transition-colors hover:border-white/40 sm:right-8 sm:bottom-8"
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      ) : null}
    </div>
  );
}
