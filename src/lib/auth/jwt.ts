import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { RoleName } from "./permissions";

export const ACCESS_TTL_SECONDS = 15 * 60;
const ISSUER = "garvhem";
const AUDIENCE = "garvhem-portal";

export type AccessClaims = { sub: string; role: RoleName; sid: string; ver: number };

const key = () => new TextEncoder().encode(env().JWT_SECRET);

export function signAccessToken(c: AccessClaims, ttlSeconds = ACCESS_TTL_SECONDS, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  return new SignJWT({ role: c.role, sid: c.sid, ver: c.ver })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(c.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + ttlSeconds)
    .sign(key());
}

export async function verifyAccessToken(token: string | undefined | null): Promise<AccessClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const { sub, role, sid, ver } = payload;
    if (typeof sub !== "string" || typeof sid !== "string" || typeof ver !== "number") return null;
    if (role !== "ADMIN" && role !== "MANAGER" && role !== "EMPLOYEE") return null;
    return { sub, role, sid, ver };
  } catch {
    return null;
  }
}
