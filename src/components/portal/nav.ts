import {
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  FileText,
  Gauge,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Settings,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  count?: "leads" | "leaves";
  exact?: boolean;
};
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "My work",
    items: [
      { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/portal/attendance", label: "Attendance", icon: Timer, permission: "own.attendance" },
      { href: "/portal/leaves", label: "Leaves", icon: CalendarDays, permission: "own.leaves" },
      { href: "/portal/tasks", label: "Tasks", icon: KanbanSquare, permission: "own.tasks" },
      { href: "/portal/daily-report", label: "Daily report", icon: FileText, permission: "own.reports" },
    ],
  },
  {
    title: "Team",
    items: [
      {
        href: "/portal/admin",
        label: "Overview",
        icon: Gauge,
        permission: "team.attendance.view",
        exact: true,
      },
      {
        href: "/portal/admin/attendance",
        label: "Timesheets",
        icon: CalendarCheck2,
        permission: "team.attendance.view",
      },
      {
        href: "/portal/admin/leaves",
        label: "Leave requests",
        icon: ClipboardList,
        permission: "leaves.approve",
        count: "leaves",
      },
      { href: "/portal/admin/tasks", label: "Workload", icon: ListChecks, permission: "tasks.assign" },
      {
        href: "/portal/admin/reports",
        label: "Daily reports",
        icon: FileText,
        permission: "reports.viewAll",
      },
      { href: "/portal/admin/leads", label: "Leads", icon: Inbox, permission: "leads.view", count: "leads" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/portal/admin/employees", label: "Employees", icon: Users, permission: "users.manage" },
      { href: "/portal/admin/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
      { href: "/portal/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit.view" },
    ],
  },
];

export function navFor(permissions: ReadonlySet<string>): NavSection[] {
  return NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.permission || permissions.has(i.permission)),
  })).filter((s) => s.items.length);
}

export const isActivePath = (pathname: string, item: Pick<NavItem, "href" | "exact">) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
