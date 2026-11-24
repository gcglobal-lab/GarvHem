import { cookies } from "next/headers";
import { handler, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { revokeByRefreshToken, revokeFamily } from "@/lib/auth/session";
import { assertSameOrigin, metaFrom } from "@/lib/request";

export const POST = handler("auth.logout", async (req) => {
  assertSameOrigin(req);
  const jar = await cookies();
  const claims = await verifyAccessToken(jar.get(ACCESS_COOKIE)?.value);
  const viaRefresh = await revokeByRefreshToken(jar.get(REFRESH_COOKIE)?.value);
  if (claims) await revokeFamily(claims.sid, claims.sub);
  const userId = claims?.sub ?? viaRefresh;
  if (userId)
    await audit({
      action: "auth.logout",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      meta: metaFrom(req.headers),
    });
  clearSessionCookies(jar);
  return json({ ok: true });
});
