import { json } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return json({ ok: true });
  } catch {
    return json({ ok: false }, { status: 503 });
  }
}
