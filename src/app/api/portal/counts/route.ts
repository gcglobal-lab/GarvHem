import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { sidebarCounts } from "@/server/dashboard";

export const GET = handler("counts", async () => json(await sidebarCounts(await requireUser())));
