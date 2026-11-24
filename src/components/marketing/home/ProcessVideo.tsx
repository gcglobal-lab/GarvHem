"use client";

import { Play } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { embedUrl, INK_BLUR, media } from "@/config/media";
import { useReturnFocus } from "../use-return-focus";

const Dialog = dynamic(() => import("@/components/ui/dialog").then((m) => m.Dialog), { ssr: false });

/** Click to play. The player is mounted only while the dialog is open. */
export function ProcessVideo() {
  const { video, poster, durationLabel } = media.process;
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [failed, setFailed] = useState(false);
  const { remember, restore } = useReturnFocus();
  if (!video) return null;
  const embed = video.kind === "embed" ? embedUrl(video.url) : null;
  if (video.kind === "embed" && !embed) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.focus(); // Safari does not focus buttons on click
          remember();
          setFailed(false);
          setUsed(true);
          setOpen(true);
        }}
        className="dark group relative isolate block w-full overflow-hidden rounded-3xl bg-ink-950 text-left text-white shadow-lift"
      >
        <span className="relative block aspect-video min-[900px]:aspect-21/9">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              sizes="(min-width: 1400px) 1280px, 100vw"
              placeholder="blur"
              blurDataURL={INK_BLUR}
              className="object-cover object-left transition-transform duration-700 group-hover:scale-[1.02]"
            />
          ) : null}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-ink-950/60 to-transparent"
          />
        </span>
        <span className="absolute right-5 bottom-5 flex items-center gap-4 sm:right-10 sm:bottom-10">
          <span className="text-right text-sm font-medium sm:text-base">
            Watch the process
            <span className="block text-[13px] font-normal text-white/75">{durationLabel}, no sound</span>
          </span>
          <span className="grid size-14 place-items-center rounded-full bg-brand shadow-lift transition-transform duration-300 group-hover:scale-110 sm:size-18">
            <Play className="ml-1 size-6 fill-current sm:size-7" aria-hidden />
          </span>
        </span>
      </button>
      {used ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) restore();
          }}
          title="How GARVHEM works"
          description="Five steps: share requirements, shortlist, approve, start, daily reports."
          size="xl"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl bg-ink-950">
            {embed ? (
              <iframe
                src={embed}
                title="How GARVHEM works"
                allow="autoplay; fullscreen; picture-in-picture"
                className="absolute inset-0 size-full border-0"
              />
            ) : failed || video.kind !== "file" ? (
              <p className="grid size-full place-items-center p-6 text-center text-white/80">
                The video could not be loaded. The five steps are described on the How it works page.
              </p>
            ) : (
              <video
                controls
                autoPlay
                playsInline
                muted
                poster={poster ?? undefined}
                className="size-full"
                aria-label="Animated explainer of the five steps, without sound"
                onError={() => setFailed(true)}
              >
                {video.webm ? <source src={video.webm} type="video/webm" /> : null}
                <source src={video.mp4} type="video/mp4" onError={() => setFailed(true)} />
              </video>
            )}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
