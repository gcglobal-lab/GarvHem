import { handler, json } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guards";
import { taskFeed } from "@/server/tasks";

export const GET = handler(
  "tasks.feed",
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission("own.tasks");
    return json(await taskFeed(user, (await params).id));
  },
);
