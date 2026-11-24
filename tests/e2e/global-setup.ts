import { execSync } from "node:child_process";
import { Client } from "pg";
import { hashPassword } from "../../src/lib/auth/password";
import { PASSWORD, TEST_DB, testEnv } from "./env";

/** Fresh schema and seed. Everyone but Mohit already changed their temporary password. */
export default async function globalSetup() {
  const pg = new Client({ connectionString: TEST_DB });
  await pg.connect();
  await pg.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pg.query("CREATE SCHEMA public");
  const env = { ...process.env, ...testEnv, NODE_ENV: "test" as const };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npm run seed", { env, stdio: "pipe" });
  await pg.query(
    `UPDATE "User" SET "passwordHash" = $1, "mustChangePassword" = false WHERE email <> 'mohit@garvhem.com'`,
    [await hashPassword(PASSWORD)],
  );
  // The calendar must never decide whether a test passes.
  await pg.query(`DELETE FROM "Holiday"`);
  await pg.query(
    `UPDATE "Setting" SET value = jsonb_set(value::jsonb, '{workWeekDays}', '[0,1,2,3,4,5,6]') WHERE key = 'attendance'`,
  );
  await pg.end();
}
