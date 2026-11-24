import { requirePagePermission } from "@/lib/auth/guards";

export default async function EmployeeListLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("users.manage");
  return children;
}
