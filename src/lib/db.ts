import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { pgOptions } from "./db-url";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const adapter = new PrismaPg({
    ...pgOptions(env()),
    max: 10,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({
    adapter,
    log: ["error"],
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });
}

/** Lazy singleton: nothing connects until the first query. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = (globalForPrisma.prisma ??= create());
    const value = Reflect.get(client, prop, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type Tx = Prisma.TransactionClient;
export type Db = Tx | PrismaClient;

/** Serialises work per key for the rest of the transaction (safe with transaction poolers). */
export async function lock(tx: Tx, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
