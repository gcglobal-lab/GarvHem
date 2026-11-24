/**
 * Runs a real PostgreSQL server without Docker (data lives in .local/pg).
 * Usage: npm run db:local   (Ctrl+C stops it)
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const dataDir = path.resolve(".local/pg");
const port = Number(process.env.LOCAL_DB_PORT ?? 5432);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => undefined,
  });

  if (!existsSync(path.join(dataDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  for (const name of ["garvhem", "garvhem_test"]) {
    const client = pg.getPgClient();
    await client.connect();
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    await client.end();
    if (!rowCount) await pg.createDatabase(name);
  }
  console.info(`PostgreSQL is running on 127.0.0.1:${port} (databases: garvhem, garvhem_test).`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error("Could not start the local database:", error);
  process.exit(1);
});
