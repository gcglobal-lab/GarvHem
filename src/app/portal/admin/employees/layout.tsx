import { forbidden } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";

/** The list needs users.manage; a manager may open profiles of their own team. */
export default async function SectionLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  if (!user.permissions.has("users.manage") && !user.permissions.has("team.attendance.view")) forbidden();
  return children;
}
