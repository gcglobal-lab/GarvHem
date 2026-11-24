import { handler, json } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guards";
import { todayState } from "@/server/attendance";

export const GET = handler("attendance.today", async () => {
  const user = await requirePermission("own.attendance");
  return json(await todayState(user.id));
});
