"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_ICONS } from "../icons";
import { Slashes } from "../Slashes";
import type { MenuService } from "./types";

/**
 * "Services" stays a real link; the button next to it opens the panel (disclosure pattern).
 * Mouse: opens on hover. Keyboard: Enter/Space/Arrow Down opens, arrows move, Escape closes and returns focus.
 */
/** The first service is the flagship. */
export function MegaMenu({ services }: { services: MenuService[] }) {
  const flagship = services[0]!;
  const serviceMenu = services.slice(1);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);

  // Close after navigation, without an effect: the panel belongs to the page it was opened on.
  if (open && openedOn !== pathname) setOpen(false);

  const show = () => {
    window.clearTimeout(timer.current);
    setOpenedOn(pathname);
    setOpen(true);
  };
  const hideSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const links = () => Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
      return;
    }
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        show();
        requestAnimationFrame(() => links()[0]?.focus());
      } else all[at + 1 < all.length ? at + 1 : 0]?.focus();
    } else if (e.key === "ArrowUp" && at >= 0) {
      e.preventDefault();
      if (at === 0) button.current?.focus();
      else all[at - 1]?.focus();
    } else if ((e.key === "Home" || e.key === "End") && at >= 0) {
      e.preventDefault();
      all[e.key === "Home" ? 0 : all.length - 1]?.focus();
    }
  }

  const FlagIcon = SERVICE_ICONS[flagship.icon];

  return (
    <div
      ref={root}
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center">
        <Link
          href="/services"
          aria-current={pathname === "/services" ? "page" : undefined}
          className="rounded-lg py-2 pl-3 text-sm font-medium text-white/80 transition-colors hover:text-white aria-[current=page]:text-white"
        >
          Services
        </Link>
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="services-menu"
          aria-label="Services menu"
          onClick={() => (open ? setOpen(false) : show())}
          className="grid size-8 place-items-center rounded-lg text-white/80 hover:text-white"
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      <div
        id="services-menu"
        ref={panel}
        hidden={!open}
        className="absolute inset-x-0 top-full px-5 pt-2 sm:px-8"
      >
        <div className="mx-auto grid max-w-[76rem] animate-pop-in grid-cols-[19rem_1fr] overflow-hidden rounded-2xl border border-white/12 bg-ink-900 shadow-lift">
          <Link
            href={`/services/${flagship.slug}`}
            className="group relative flex flex-col justify-between overflow-hidden bg-ink-950 p-6 focus-visible:-outline-offset-2"
          >
            <Slashes />
            <span className="relative">
              <FlagIcon className="size-6 text-white" aria-hidden />
              <span className="mt-5 block font-display text-xl font-semibold tracking-tight">
                {flagship.name}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-white/75">{flagship.summary}</span>
            </span>
            <span className="relative mt-8 inline-flex items-center gap-2 text-sm font-medium">
              See how it works
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
          <div className="p-4">
            <ul className="grid grid-cols-2 gap-1">
              {serviceMenu.map((s) => {
                const Icon = SERVICE_ICONS[s.icon];
                return (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${s.slug}`}
                      className="flex gap-4 rounded-xl p-4 transition-colors hover:bg-white/6"
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                      <span>
                        <span className="block text-[15px] font-medium">{s.name}</span>
                        <span className="mt-1 block text-[13px] leading-snug text-white/65">{s.summary}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 px-4 pt-4 pb-1 text-sm">
              <Link href="/services" className="rounded font-medium hover:underline">
                All services
              </Link>
              <Link href="/industries" className="rounded text-white/70 hover:text-white hover:underline">
                Industries we work with
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
