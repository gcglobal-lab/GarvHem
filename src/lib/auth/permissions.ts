/** Central RBAC map. Never check roles elsewhere: ask for a permission. */
export type RoleName = "ADMIN" | "MANAGER" | "EMPLOYEE";

export const PERMISSIONS = [
  "own.attendance",
  "own.leaves",
  "own.tasks",
  "own.reports",
  "team.attendance.view",
  "team.attendance.edit",
  "leaves.approve",
  "leaves.adjustBalance",
  "tasks.create",
  "tasks.assign",
  "reports.viewAll",
  "leads.view",
  "leads.manage",
  "users.manage",
  "settings.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const OWN: Permission[] = ["own.attendance", "own.leaves", "own.tasks", "own.reports"];

const ROLE_DEFAULTS: Record<RoleName, readonly Permission[]> = {
  EMPLOYEE: OWN,
  MANAGER: [
    ...OWN,
    "team.attendance.view",
    "leaves.approve",
    "tasks.create",
    "tasks.assign",
    "reports.viewAll",
  ],
  ADMIN: PERMISSIONS,
};

/** Manager permissions an admin may switch on or off in Settings. */
export const CONFIGURABLE_MANAGER_PERMISSIONS = [
  "team.attendance.edit",
  "leaves.adjustBalance",
  "leads.view",
  "leads.manage",
] as const satisfies readonly Permission[];
export type ConfigurablePermission = (typeof CONFIGURABLE_MANAGER_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<ConfigurablePermission, { label: string; hint: string }> = {
  "team.attendance.edit": {
    label: "Correct team attendance",
    hint: "Edit punch times with a mandatory reason.",
  },
  "leaves.adjustBalance": {
    label: "Adjust leave balances",
    hint: "Add or subtract leave days with a reason.",
  },
  "leads.view": { label: "View leads", hint: "Read website enquiries and their attachments." },
  "leads.manage": { label: "Manage leads", hint: "Change status, owner, follow-ups and notes." },
};

export function effectivePermissions(role: RoleName, managerToggles: Iterable<string> = []): Set<Permission> {
  const set = new Set<Permission>(ROLE_DEFAULTS[role]);
  if (role === "MANAGER") {
    const configurable = new Set<string>(CONFIGURABLE_MANAGER_PERMISSIONS);
    for (const p of managerToggles) if (configurable.has(p)) set.add(p as Permission);
    if (set.has("leads.manage")) set.add("leads.view");
  }
  return set;
}
