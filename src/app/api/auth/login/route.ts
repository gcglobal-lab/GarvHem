import { cookies } from "next/headers";
import { parseInput } from "@/lib/action";
import { handler, json, readJson } from "@/lib/api";
import { setSessionCookies } from "@/lib/auth/cookies";
import { assertSameOrigin, metaFrom } from "@/lib/request";
import { loginSchema } from "@/lib/validators/auth";
import { login } from "@/server/auth";

export const POST = handler("auth.login", async (req) => {
  assertSameOrigin(req);
  const input = parseInput(loginSchema, await readJson(req, 4_000));
  const { tokens, mustChangePassword } = await login(input, metaFrom(req.headers));
  setSessionCookies(await cookies(), tokens);
  return json({ ok: true, mustChangePassword });
});
