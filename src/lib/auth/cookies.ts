import { ACCESS_TTL_SECONDS } from "./jwt";

const production = process.env.NODE_ENV === "production";
/** The prefixes make browsers refuse copies planted by a subdomain or over plain HTTP. */
export const ACCESS_COOKIE = production ? "__Host-gv_at" : "gv_at";
export const REFRESH_COOKIE = production ? "__Secure-gv_rt" : "gv_rt";
/** Carries no secret: tells the proxy that a refresh is worth trying. */
export const HINT_COOKIE = production ? "__Host-gv_s" : "gv_s";
export const REFRESH_PATH = "/api/auth";

const base = () => ({ httpOnly: true, sameSite: "lax", secure: production }) as const;

type CookieSetter = {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
};

export function setAccessCookie(jar: CookieSetter, accessToken: string) {
  jar.set(ACCESS_COOKIE, accessToken, { ...base(), path: "/", maxAge: ACCESS_TTL_SECONDS });
}

export function setSessionCookies(
  jar: CookieSetter,
  t: { accessToken: string; refreshToken: string; expiresAt: Date; persistent: boolean },
) {
  setAccessCookie(jar, t.accessToken);
  // Without "Remember me" these are browser-session cookies; the server still enforces 7 days.
  const expiry = t.persistent ? { expires: t.expiresAt } : {};
  jar.set(REFRESH_COOKIE, t.refreshToken, { ...base(), path: REFRESH_PATH, ...expiry });
  jar.set(HINT_COOKIE, "1", { ...base(), path: "/", ...expiry });
}

export function clearSessionCookies(jar: CookieSetter) {
  jar.set(ACCESS_COOKIE, "", { ...base(), path: "/", maxAge: 0 });
  jar.set(REFRESH_COOKIE, "", { ...base(), path: REFRESH_PATH, maxAge: 0 });
  jar.set(HINT_COOKIE, "", { ...base(), path: "/", maxAge: 0 });
}
