import { NextResponse } from "next/server";
import { handler, json } from "@/lib/api";
import { REFRESH_COOKIE, clearSessionCookies, setAccessCookie, setSessionCookies } from "@/lib/auth/cookies";
import { refreshSession } from "@/lib/auth/session";
import { assertSameOrigin, metaFrom } from "@/lib/request";
import { safeNext } from "@/lib/utils";

const PREFIXES = ["/portal", "/change-password", "/api/portal"];

function cookieValue(req: Request, name: string) {
  const match = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

/**
 * Rotates the refresh token. With ?next= (sent here by the proxy) it answers with a 307 back to
 * the original URL, keeping method and body; without it, it answers JSON for the client keep-alive.
 */
async function refresh(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next");
  if (req.method !== "GET") assertSameOrigin(req);
  else if (req.headers.get("sec-fetch-site") === "cross-site" && !rawNext)
    return new Response(null, { status: 403 });

  const result = await refreshSession(cookieValue(req, REFRESH_COOKIE), metaFrom(req.headers));
  const next = safeNext(rawNext, "/portal", PREFIXES);
  const apiCaller = next.startsWith("/api/");

  if (result.kind === "invalid") {
    const res =
      rawNext && !apiCaller
        ? redirect(`/login?reason=expired&next=${encodeURIComponent(next)}`, 303)
        : json(
            { ok: false, error: "Your session has ended. Please sign in again.", code: "UNAUTHENTICATED" },
            { status: 401 },
          );
    clearSessionCookies(res.cookies);
    return res;
  }

  const res = rawNext ? redirect(next, 307) : json({ ok: true });
  if (result.kind === "rotated") setSessionCookies(res.cookies, result.tokens);
  else setAccessCookie(res.cookies, result.accessToken);
  return res;
}

/** Relative Location keeps the browser on whatever host it used. */
const redirect = (location: string, status: number) =>
  new NextResponse(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });

export const GET = handler("auth.refresh", refresh);
export const POST = handler("auth.refresh", refresh);
