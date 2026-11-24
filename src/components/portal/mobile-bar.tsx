"use client";

import { FileText, KanbanSquare, LayoutDashboard, LogIn, LogOut, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath } from "./nav";
import { ReportPrompt } from "./report-prompt";
import { useAttendance } from "./use-attendance";

const LEFT = [
  { href: "/portal", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/portal/attendance", label: "Attendance", icon: Timer },
];
const RIGHT = [
  { href: "/portal/tasks", label: "Tasks", icon: KanbanSquare },
  { href: "/portal/daily-report", label: "Report", icon: FileText },
];

/** Phone navigation with punch in/out one tap away on every page. */
export function MobileBar() {
  const pathname = usePathname();
  const a = useAttendance();
  const isIn = a.data?.state === "WORKING" || a.data?.state === "ON_LUNCH";
  const item = (i: (typeof LEFT)[number]) => {
    const active = isActivePath(pathname, i);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
          active ? "text-foreground" : "text-muted",
        )}
      >
        <i.icon className={cn("size-5", active && "text-brand dark:text-brand-strong")} aria-hidden />
        {i.label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[68px] grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {LEFT.map(item)}
      <div className="relative grid place-items-center">
        <button
          onClick={() => void a.punch(isIn ? "PUNCH_OUT" : "PUNCH_IN")}
          disabled={!a.data || a.pending || (!isIn && !a.data.canPunchIn)}
          aria-label={isIn ? "Punch out now" : "Punch in now"}
          className={cn(
            "absolute -top-5 grid size-16 place-items-center rounded-full border-4 border-canvas shadow-lift disabled:opacity-60",
            isIn ? "bg-primary text-primary-foreground" : "bg-brand text-white",
          )}
        >
          {isIn ? <LogOut className="size-6" aria-hidden /> : <LogIn className="size-6" aria-hidden />}
        </button>
        <span className="absolute bottom-1.5 text-[11px] font-medium">{isIn ? "Out" : "In"}</span>
      </div>
      {RIGHT.map(item)}
      <ReportPrompt
        mode={a.reportPrompt}
        pending={a.pending}
        onClose={a.closePrompt}
        onSkip={() => void a.punch("PUNCH_OUT", true)}
      />
    </nav>
  );
}
