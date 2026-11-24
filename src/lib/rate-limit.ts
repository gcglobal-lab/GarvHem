import "server-only";
import { db } from "./db";
import { env } from "./env";
import { AppError } from "./errors";
import { SHARED_IP } from "./request";

export type LimitResult = { allowed: boolean; count: number; retryAfterSeconds: number };

/** Fixed-window limiter. Implementations must increment atomically. */
export interface RateLimiter {
  consume(key: string, limit: number, windowSeconds: number): Promise<LimitResult>;
  refund(key: string): Promise<void>;
  /** Restarts the window without touching the count. */
  extend(key: string, windowSeconds: number): Promise<void>;
  reset(key: string): Promise<void>;
}

class DatabaseLimiter implements RateLimiter {
  async consume(key: string, limit: number, windowSeconds: number): Promise<LimitResult> {
    const now = new Date();
    const expires = new Date(now.getTime() + windowSeconds * 1000);
    const rows = await db.$queryRaw<{ count: number; expiresAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expires})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN ${expires} ELSE "RateLimit"."expiresAt" END
      RETURNING "count", "expiresAt"`;
    const row = rows[0] ?? { count: 1, expiresAt: expires };
    return {
      allowed: row.count <= limit,
      count: row.count,
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.expiresAt).getTime() - now.getTime()) / 1000)),
    };
  }
  async refund(key: string) {
    await db.rateLimit.updateMany({ where: { key, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
  }
  async extend(key: string, windowSeconds: number) {
    await db.rateLimit.updateMany({
      where: { key },
      data: { expiresAt: new Date(Date.now() + windowSeconds * 1000) },
    });
  }
  async reset(key: string) {
    await db.rateLimit.deleteMany({ where: { key } });
  }
}

class UpstashLimiter implements RateLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}
  private async pipeline(commands: (string | number)[][]): Promise<{ result: number }[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
    return (await res.json()) as { result: number }[];
  }
  async consume(key: string, limit: number, windowSeconds: number): Promise<LimitResult> {
    const [incr, , ttl] = await this.pipeline([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds, "NX"],
      ["TTL", key],
    ]);
    const count = incr?.result ?? 1;
    return { allowed: count <= limit, count, retryAfterSeconds: Math.max(1, ttl?.result ?? windowSeconds) };
  }
  async refund(key: string) {
    await this.pipeline([["DECR", key]]);
  }
  async extend(key: string, windowSeconds: number) {
    await this.pipeline([["EXPIRE", key, windowSeconds]]);
  }
  async reset(key: string) {
    await this.pipeline([["DEL", key]]);
  }
}

let instance: RateLimiter | undefined;
export function rateLimiter(): RateLimiter {
  if (!instance) {
    const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
    instance = url && token ? new UpstashLimiter(url, token) : new DatabaseLimiter();
  }
  return instance;
}

/** Self-hosted without a trusted proxy, every client shares one bucket, so it is made larger. */
export const ipBudget = (ip: string, limit: number) => (ip === SHARED_IP ? limit * 20 : limit);

export async function enforceLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  const r = await rateLimiter().consume(key, limit, windowSeconds);
  if (!r.allowed) {
    const mins = Math.ceil(r.retryAfterSeconds / 60);
    throw new AppError(
      "RATE_LIMITED",
      message ?? `Too many requests. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    );
  }
}
