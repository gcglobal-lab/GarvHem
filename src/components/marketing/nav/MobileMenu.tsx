"use client";

import { ArrowRight, LogIn, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { DialogClose, Drawer } from "@/components/ui/dialog";
import { LOGIN_HREF, mainNav } from "@/config/navigation";
import { SERVICE_ICONS } from "../icons";
import type { MenuService } from "./types";

export function MobileMenu({
  open,
  onOpenChange,
  services,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: MenuService[];
}) {
  const pathname = usePathname();
  const close = () => onOpenChange(false);
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Menu"
      className="dark w-full bg-ink-950 sm:w-[26rem]"
    >
      <div className="flex h-18 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link href="/" onClick={close} aria-label="GARVHEM home" className="rounded-lg">
          <Logo tone="chrome" className="gap-2.5" markClassName="h-8" wordClassName="h-3" />
        </Link>
        <DialogClose asChild>
          <Button variant="glass" size="icon" aria-label="Close menu">
            <X aria-hidden />
          </Button>
        </DialogClose>
      </div>
      <nav aria-label="Mobile" className="flex-1 scrollbar-thin overflow-y-auto px-5 py-6">
        <ul className="space-y-1">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                aria-current={pathname === item.href ? "page" : undefined}
                className="block rounded-xl py-2.5 font-display text-2xl font-semibold tracking-tight text-white/90 aria-[current=page]:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/services"
          onClick={close}
          className="mt-7 flex items-center justify-between border-t border-white/10 pt-6 text-sm font-medium text-white/70"
        >
          All services
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <ul className="mt-2">
          {services.map((s) => {
            const Icon = SERVICE_ICONS[s.icon];
            return (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  onClick={close}
                  aria-current={pathname === `/services/${s.slug}` ? "page" : undefined}
                  className="flex items-center gap-3.5 rounded-xl py-2.5 text-[15px] text-white/90"
                >
                  <Icon className="size-5 shrink-0 text-accent" aria-hidden />
                  {s.name}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex gap-6 border-t border-white/10 pt-5 text-[15px] text-white/75">
          <Link href="/industries" onClick={close}>
            Industries
          </Link>
          <Link href="/careers" onClick={close}>
            Careers
          </Link>
        </div>
      </nav>
      <div className="grid shrink-0 gap-2.5 border-t border-white/10 p-5">
        <Button asChild variant="brand" size="lg">
          <Link href="/contact" onClick={close}>
            Get a Free Consultation
          </Link>
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link href={LOGIN_HREF} prefetch={false} onClick={close}>
            <LogIn aria-hidden />
            Employee Login
          </Link>
        </Button>
      </div>
    </Drawer>
  );
}
