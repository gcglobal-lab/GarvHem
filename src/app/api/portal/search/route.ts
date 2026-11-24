import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { enforceLimit } from "@/lib/rate-limit";
import { listLeads } from "@/server/leads";
import { teamWhere } from "@/server/scope";
import { listTasks } from "@/server/tasks";

type Hit = { group: "Tasks" | "People" | "Leads"; title: string; subtitle: string; href: string };

/** Global search. Every section reuses the same scoping as its own page. */
export const GET = handler("search", async (req) => {
  const user = await requireUser();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return json([]);
  await enforceLimit(`search:${user.id}`, 120, 60);
  const contains = { contains: q, mode: "insensitive" as const };
  const canSeePeople = user.permissions.has("users.manage") || user.permissions.has("team.attendance.view");
  const [tasks, people, leads] = await Promise.all([
    listTasks(user, { q }, 6),
    canSeePeople
      ? db.user.findMany({
          where: { AND: [await teamWhere(user), { OR: [{ name: contains }, { employeeCode: contains }] }] },
          take: 5,
          select: { id: true, name: true, designation: true, employeeCode: true },
        })
      : [],
    user.permissions.has("leads.view") ? listLeads({ q }, 5) : [],
  ]);
  const hits: Hit[] = [
    ...tasks.map((t) => ({
      group: "Tasks" as const,
      title: t.title,
      subtitle: `#${t.number}`,
      href: `/portal/tasks/${t.id}`,
    })),
    ...people.map((p) => ({
      group: "People" as const,
      title: p.name,
      subtitle: [p.employeeCode, p.designation].filter(Boolean).join(", "),
      href: `/portal/admin/employees/${p.id}`,
    })),
    ...leads.map((l) => ({
      group: "Leads" as const,
      title: l.fullName,
      subtitle: [l.company, l.country].filter(Boolean).join(", "),
      href: `/portal/admin/leads/${l.id}`,
    })),
  ];
  return json(hits);
});
