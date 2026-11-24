import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/portal/page-header";
import { CreateUserButton } from "@/components/portal/user-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Avatar, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/guards";
import { flatParams, type SearchParams } from "@/lib/page";
import { timeAgo, workDateOf } from "@/lib/time";
import { userFilterSchema } from "@/lib/validators/users";
import { listLeaveTypes } from "@/server/leaves";
import { getSettings } from "@/server/settings";
import { listDepartments, listManagers, listUsers, suggestEmployeeCode } from "@/server/users";

export const metadata: Metadata = { title: "Employees" };

const ROLE = { ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Employee" } as const;

export default async function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePagePermission("users.manage");
  const filter = userFilterSchema.parse(await flatParams(searchParams));
  const [users, departments, managers, types, code, { company, attendance }] = await Promise.all([
    listUsers(filter),
    listDepartments(),
    listManagers(),
    listLeaveTypes(),
    suggestEmployeeCode(),
    getSettings(),
  ]);
  const filtered = Object.values(filter).some(Boolean);
  return (
    <>
      <PageHeader
        title="Employees"
        description={`${users.length} ${users.length === 1 ? "person" : "people"}`}
        actions={
          <CreateUserButton
            managers={managers}
            departments={departments}
            leaveTypes={types}
            suggestedCode={code}
            today={workDateOf(new Date(), company.timezone)}
            shift={{ start: attendance.shiftStart, end: attendance.shiftEnd }}
          />
        }
      />
      <form action="/portal/admin/employees" className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Input
          type="search"
          name="q"
          defaultValue={filter.q}
          placeholder="Name, email or ID"
          aria-label="Search employees"
          className="col-span-2 sm:w-60"
        />
        <Select name="role" defaultValue={filter.role} aria-label="Role" className="sm:w-36">
          <option value="">Any role</option>
          {Object.entries(ROLE).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={filter.status} aria-label="Status" className="sm:w-36">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select
          name="department"
          defaultValue={filter.department}
          aria-label="Department"
          className="sm:w-44"
        >
          <option value="">Any department</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {filtered ? (
          <Button asChild variant="ghost">
            <Link href="/portal/admin/employees">Clear</Link>
          </Button>
        ) : null}
      </form>
      <Card>
        {users.length ? (
          <Table label="Employees">
            <thead>
              <tr>
                {["Employee", "ID", "Role", "Department", "Manager", "Last login", "Status"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="relative hover:bg-surface-2/60">
                  <Td className="min-w-56">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} className="size-9" />
                      <span className="min-w-0">
                        <Link
                          href={`/portal/admin/employees/${u.id}`}
                          className="font-medium after:absolute after:inset-0"
                        >
                          {u.name}
                        </Link>
                        <span className="block truncate text-xs text-muted">{u.email}</span>
                      </span>
                    </span>
                  </Td>
                  <Td className="tabular whitespace-nowrap">{u.employeeCode}</Td>
                  <Td>
                    <Badge
                      tone={u.role === "ADMIN" ? "accent" : u.role === "MANAGER" ? "warning" : "neutral"}
                    >
                      {ROLE[u.role]}
                    </Badge>
                  </Td>
                  <Td>
                    {u.department ?? "-"}
                    <span className="block text-xs text-muted">{u.designation}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{u.manager?.name ?? "-"}</Td>
                  <Td className="text-xs whitespace-nowrap text-muted">
                    {u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}
                  </Td>
                  <Td>
                    <span className="flex gap-1">
                      <Badge tone={u.isActive ? "success" : "danger"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {u.lockedUntil ? <Badge tone="warning">Locked</Badge> : null}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={Users} title="No one matches" description="Clear a filter and try again." />
        )}
      </Card>
    </>
  );
}
