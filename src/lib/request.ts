import "server-only";
import { headers } from "next/headers";
import { env } from "./env";
import { AppError } from "./errors";

/** Used when the client address cannot be trusted (self-hosted in production without TRUST_PROXY). */
export const SHARED_IP = "direct";

export type RequestMeta = { ip: string; userAgent: string };

export function metaFrom(h: Headers): RequestMeta {
  let ip = "unknown";
  if (process.env.VERCEL) {
    // Vercel overwrites these, so a client cannot spoof them.
    ip = h.get("x-real-ip") ?? h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? ip;
  } else if (env().TRUST_PROXY) {
    ip = h.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? ip;
  } else if (process.env.NODE_ENV !== "production") {
    ip = h.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? ip;
  } else {
    ip = SHARED_IP; // any header could be forged by the client
  }
  return { ip: ip.slice(0, 64), userAgent: (h.get("user-agent") ?? "unknown").slice(0, 300) };
}

export const requestMeta = async (): Promise<RequestMeta> => metaFrom(await headers());

/** CSRF defence for route handlers: the browser-set Origin must match the host being called. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let ok = false;
  if (origin && host) {
    try {
      ok = new URL(origin).host === host;
    } catch {
      ok = false;
    }
  }
  if (!ok) throw new AppError("FORBIDDEN", "Cross-origin request blocked.");
}
