import { z } from "zod";
import { parseInput } from "@/lib/action";
import { handler, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/request";
import { id } from "@/lib/validators/common";
import { listNotifications, markNotificationsRead } from "@/server/notifications";

export const GET = handler("notifications.list", async () => {
  const user = await requireUser();
  return json(await listNotifications(user.id));
});

const schema = z.object({ id: id.optional() });

export const POST = handler("notifications.read", async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await markNotificationsRead(user.id, parseInput(schema, await readJson(req)).id);
  return json({ ok: true });
});
