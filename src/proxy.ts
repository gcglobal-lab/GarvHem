import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, HINT_COOKIE } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { safeNext } from "@/lib/utils";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. This file:
 *   1. sets the nonce-based Content-Security-Policy,
 *   2. guards /portal and /api/portal (first line of defence only: every page, action and
 *      route handler authenticates and authorises again on its own).
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : process.env.APP_URL?.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-pathname", pathname + search);
  headers.set("content-security-policy", csp);

  const finish = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const protectedPage = isUnder(pathname, "/portal") || pathname === "/change-password";
  const protectedApi = isUnder(pathname, "/api/portal");

  if (protectedPage || protectedApi || pathname === "/login") {
    const claims = await verifyAccessToken(req.cookies.get(ACCESS_COOKIE)?.value);
    const canRefresh = req.cookies.has(HINT_COOKIE);

    if (pathname === "/login") {
      if (claims)
        return finish(
          NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")), req.url)),
        );
      if (canRefresh && req.method === "GET")
        return finish(toRefresh(req, safeNext(req.nextUrl.searchParams.get("next"))));
    } else if (!claims) {
      const next = safeNext(pathname + search);
      if (protectedApi) {
        // GET requests (downloads, polling) are replayed after a refresh; clients retry writes themselves.
        if (canRefresh && req.method === "GET") return finish(toRefresh(req, pathname + search));
        return finish(
          NextResponse.json(
            { ok: false, error: "Please sign in.", code: "UNAUTHENTICATED" },
            { status: 401 },
          ),
        );
      }
      if (canRefresh) return finish(toRefresh(req, next));
      return finish(NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url), 303));
    } else if (claims.role === "EMPLOYEE" && isUnder(pathname, "/api/portal/admin")) {
      return finish(
        NextResponse.json(
          { ok: false, error: "You do not have permission to do that.", code: "FORBIDDEN" },
          { status: 403 },
        ),
      );
    }
  }

  return finish(NextResponse.next({ request: { headers } }));
}

/** 307 keeps the method and body, so an expired token never loses a Server Action. */
function toRefresh(req: NextRequest, next: string) {
  const url = new URL("/api/auth/refresh", req.url);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static/|_next/image$|media/[^?]+\\.[a-z0-9]+$|icon\\.svg$|apple-icon\\.png$|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|opengraph-image$|manifest\\.webmanifest$).*)",
    },
  ],
};
