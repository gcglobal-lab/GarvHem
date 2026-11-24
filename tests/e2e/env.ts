export const PORT = 3200;
export const BASE_URL = `http://localhost:${PORT}`;

export const TEST_DB =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garvhem_test";

const url = new URL(TEST_DB);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test"))
  throw new Error(
    "End-to-end tests wipe their database, so they only run on a local database ending in _test.",
  );

export const CRON_SECRET = "e2e-cron-secret-e2e-cron-secret";

/** Set explicitly so nothing from .env can leak into a test run. */
export const testEnv: Record<string, string> = {
  DATABASE_URL: TEST_DB,
  DIRECT_URL: "",
  DATABASE_SSL: "disable",
  DATABASE_CA_CERT: "",
  APP_URL: BASE_URL,
  JWT_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret-1234",
  CRON_SECRET,
  TRUST_PROXY: "true",
  EMAIL_PROVIDER: "console",
  ADMIN_NOTIFY_EMAIL: "",
  SMTP_HOST: "",
  RESEND_API_KEY: "",
  STORAGE_PROVIDER: "local",
  STORAGE_DIR: "./.local/e2e-storage",
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
  SEED_EMAIL_DOMAIN: "garvhem.com",
  SEED_ADMIN_PASSWORD: "Nimbus#Route42",
  SEED_EMPLOYEE_PASSWORD: "Copper!Lake77",
};

export const SEEDED = { admin: "Nimbus#Route42", employee: "Copper!Lake77" };
export const PASSWORD = "Granite!Otter91";
export const ADMIN = "hemant@garvhem.com";
export const EMPLOYEES = ["abhishek", "yuvraj", "pushpendra", "rakshit", "mohit"].map(
  (n) => `${n}@garvhem.com`,
);
