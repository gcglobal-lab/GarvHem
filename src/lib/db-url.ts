import type { Env } from "./env";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

type DbEnv = Pick<Env, "DATABASE_URL" | "DATABASE_SSL" | "DATABASE_CA_CERT">;

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db"]);

/**
 * node-postgres options. Remote connections are encrypted and the server certificate is verified:
 * against Supabase's own root for Supabase hosts, DATABASE_CA_CERT when set, or the system roots.
 */
const IGNORED_PARAMS = [
  "ssl",
  "sslmode",
  "sslaccept",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "uselibpqcompat",
  "pgbouncer",
  "connection_limit",
];

export function pgOptions(e: DbEnv) {
  const url = new URL(e.DATABASE_URL);
  // Handled below: in a URL these would override the explicit ssl option.
  for (const p of IGNORED_PARAMS) url.searchParams.delete(p);
  const local = LOCAL.has(url.hostname);
  const mode = e.DATABASE_SSL === "auto" ? (local ? "disable" : "verify") : e.DATABASE_SSL;
  if (mode === "disable") return { connectionString: url.toString(), ssl: false as const };
  const supabase = /\.supabase\.(co|com)$/.test(url.hostname);
  const ca = e.DATABASE_CA_CERT?.replace(/\\n/g, "\n") ?? (supabase ? SUPABASE_ROOT_CA : undefined);
  return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: mode === "verify" } };
}
