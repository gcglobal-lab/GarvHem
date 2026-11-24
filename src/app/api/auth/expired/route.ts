import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, clearSessionCookies } from "@/lib/auth/cookies";
import { getCurrentUser } from "@/lib/auth/guards";
import { canRefresh, revokeByRefreshToken } from "@/lib/auth/session";
import { safeNext } from "@/lib/utils";

/** Clears cookies that no longer belong to a live session (deactivated, revoked, logged out elsewhere). */
export const GET = handler("auth.expired", async (req) => {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const headers = (location: string) => ({ Location: location, "Cache-Control": "no-store" });
  if (await getCurrentUser()) return new NextResponse(null, { status: 303, headers: headers(next) });
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (await canRefresh(refreshToken))
    return new NextResponse(null, {
      status: 303,
      headers: headers(`/api/auth/refresh?next=${encodeURIComponent(next)}`),
    });
  await revokeByRefreshToken(refreshToken);
  const res = new NextResponse(null, {
    status: 303,
    headers: headers(`/login?reason=expired&next=${encodeURIComponent(next)}`),
  });
  clearSessionCookies(res.cookies);
  return res;
});
