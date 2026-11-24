"use client";

import { ArrowRight, Menu } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LOGIN_HREF, mainNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { QuoteLink } from "../quote/QuoteLink";
import { MegaMenu } from "./MegaMenu";
import { useReturnFocus } from "../use-return-focus";
import type { MenuService } from "./types";

// Loaded on the first tap (and warmed up on touch), so phones do not pay for it up front.
const loadMobileMenu = () => import("./MobileMenu").then((m) => m.MobileMenu);
const MobileMenu = dynamic(loadMobileMenu, { ssr: false });

export const navLinkClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white aria-[current=page]:text-white";

export function Navbar({ services }: { services: MenuService[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);
  const { remember, restore } = useReturnFocus();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "dark fixed inset-x-0 top-0 z-40 border-b text-white transition-[background-color,border-color] duration-300",
        scrolled
          ? "border-white/10 bg-ink-950/90 backdrop-blur-xl backdrop-saturate-150"
          : "border-white/8 bg-ink-950/80 backdrop-blur-md",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-18 w-full max-w-[80rem] items-center gap-2 px-5 min-[1800px]:max-w-[94rem] sm:px-8"
      >
        <Link href="/" className="mr-auto rounded-lg lg:mr-6" aria-label="GARVHEM home">
          <Logo tone="chrome" className="gap-2.5" markClassName="h-8 sm:h-9" wordClassName="h-3 sm:h-3.5" />
        </Link>

        <div className="hidden items-center lg:flex">
          <MegaMenu services={services} />
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={navLinkClass}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:ml-auto lg:flex">
          <Link href={LOGIN_HREF} prefetch={false} className={cn(navLinkClass, "hidden xl:block")}>
            Employee Login
          </Link>
          <Button asChild variant="brand">
            <QuoteLink>Get a Free Consultation</QuoteLink>
          </Button>
        </div>

        <Button asChild variant="brand" size="sm" className="hidden h-9 min-[400px]:inline-flex lg:hidden">
          <QuoteLink>
            Get a quote
            <ArrowRight aria-hidden />
          </QuoteLink>
        </Button>
        <Button
          variant="glass"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onPointerEnter={() => void loadMobileMenu()}
          onFocus={() => void loadMobileMenu()}
          onClick={(e) => {
            e.currentTarget.focus();
            remember();
            setMobileLoaded(true);
            setMobileOpen(true);
          }}
        >
          <Menu aria-hidden />
        </Button>
        {mobileLoaded ? (
          <MobileMenu
            services={services}
            open={mobileOpen}
            onOpenChange={(next) => {
              setMobileOpen(next);
              if (!next) restore();
            }}
          />
        ) : null}
      </nav>
    </header>
  );
}
