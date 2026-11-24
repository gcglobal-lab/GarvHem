import { handler, json } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guards";
import { liveBoard } from "@/server/attendance";

export const GET = handler("attendance.board", async () => {
  const user = await requirePermission("team.attendance.view");
  return json(await liveBoard(user));
});
