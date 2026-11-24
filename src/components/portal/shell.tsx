"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronsLeft, KeyRound, LogOut, Menu as MenuIcon, Moon, Sun, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tooltip } from "@/components/ui/menu";
import { Avatar } from "@/components/ui/misc";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { LiveClock } from "./live-clock";
import { MobileBar } from "./mobile-bar";
import { signOut } from "./logout-button";
import { isActivePath, navFor, type NavItem } from "./nav";
import { NotificationsBell } from "./notifications-bell";
import { setTheme, usePortal } from "./providers";

type Counts = { leads: number; leaves: number };

function NavLink({
  item,
  collapsed,
  counts,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  counts?: Counts;
  onNavigate?: () => void;
}) {
  const active = isActivePath(usePathname(), item);
  const count = item.count ? (counts?.[item.count] ?? 0) : 0;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/70 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <span className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-brand" aria-hidden />
      ) : null}
      <item.icon
        className={cn("size-[18px] shrink-0", active && "text-brand dark:text-brand-strong")}
        aria-hidden
      />
      <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
      {count > 0 ? (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] leading-5 font-semibold text-white",
            collapsed && "absolute top-1 right-1.5 min-w-4 px-1 text-[10px] leading-4",
          )}
        >
          {count > 99 ? "99+" : count}
          <span className="sr-only"> new</span>
        </span>
      ) : null}
    </Link>
  );
  return collapsed ? (
    <Tooltip label={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function Navigation({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { permissions } = usePortal();
  const set = new Set(permissions);
  const { data: counts } = useQuery({
    queryKey: ["counts"],
    queryFn: () => api<Counts>("/api/portal/counts"),
    refetchInterval: 45_000,
    enabled: set.has("leads.view") || set.has("leaves.approve"),
  });
  return (
    <nav
      aria-label="Portal"
      className="flex-1 scrollbar-thin space-y-6 overflow-x-hidden overflow-y-auto px-3 py-4"
    >
      {navFor(set).map((section) => (
        <div key={section.title}>
          <p className={cn("mb-1.5 px-3 text-xs font-medium text-muted", collapsed && "sr-only")}>
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} collapsed={collapsed} counts={counts} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { name, email, roleLabel } = usePortal();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button className="rounded-full" aria-label={`Account menu for ${name}`}>
          <Avatar name={name} className="size-9" />
        </button>
      </MenuTrigger>
      <MenuContent className="w-60">
        <div className="px-2.5 pt-1 pb-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
          <p className="mt-1 text-xs text-muted">{roleLabel}</p>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/portal/profile">
            <User aria-hidden /> Profile
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/portal/profile#password">
            <KeyRound aria-hidden /> Change password
          </Link>
        </MenuItem>
        <MenuSeparator />
        <MenuItem tone="danger" onSelect={() => void signOut()}>
          <LogOut aria-hidden /> Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Switch between light and dark mode"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
    >
      <Moon className="dark:hidden" aria-hidden />
      <Sun className="hidden dark:block" aria-hidden />
    </Button>
  );
}

export function PortalShell({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.cookie = `gv_nav=${collapsed ? "1" : "0"}; path=/portal; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <a
        href="#content"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center" : "px-5",
          )}
        >
          <Link href="/portal" aria-label="GARVHEM dashboard">
            {collapsed ? <LogoMark className="h-8" /> : <Logo markClassName="h-8" wordClassName="h-3.5" />}
          </Link>
        </div>
        <Navigation collapsed={collapsed} />
        <div className="border-t border-border p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronsLeft
              className={cn("size-4 transition-transform", collapsed && "rotate-180")}
              aria-hidden
            />
            <span className={cn(collapsed && "sr-only")}>
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </button>
        </div>
      </aside>

      <Drawer open={drawer} onOpenChange={setDrawer} title="Navigation">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Logo markClassName="h-8" wordClassName="h-3.5" />
        </div>
        <Navigation collapsed={false} onNavigate={() => setDrawer(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setDrawer(true)}
          >
            <MenuIcon aria-hidden />
          </Button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <LiveClock />
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu />
          </div>
        </header>
        <main
          id="content"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <MobileBar />
    </div>
  );
}
