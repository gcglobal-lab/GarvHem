import { z } from "zod";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_SSL: z.enum(["auto", "disable", "require", "verify"]).default("auto"),
    DATABASE_CA_CERT: optional,
    APP_URL: z.url().transform((v) => v.replace(/\/+$/, "")),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (256 bits)"),
    CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),
    TRUST_PROXY: z
      .enum(["true", "false", ""])
      .default("false")
      .transform((v) => v === "true"),
    EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("GARVHEM <no-reply@garvhem.com>"),
    ADMIN_NOTIFY_EMAIL: optional,
    SMTP_HOST: optional,
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: optional,
    SMTP_PASSWORD: optional,
    RESEND_API_KEY: optional,
    STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
    STORAGE_DIR: z.string().default("./storage"),
    SUPABASE_URL: optional,
    SUPABASE_SERVICE_ROLE_KEY: optional,
    SUPABASE_STORAGE_BUCKET: z.string().default("garvhem-private"),
    UPSTASH_REDIS_REST_URL: optional,
    UPSTASH_REDIS_REST_TOKEN: optional,
    TURNSTILE_SITE_KEY: optional,
    TURNSTILE_SECRET_KEY: optional,
  })
  .superRefine((env, ctx) => {
    const need = (ok: unknown, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", message });
    };
    if (env.EMAIL_PROVIDER === "smtp") need(env.SMTP_HOST, "SMTP_HOST is required when EMAIL_PROVIDER=smtp");
    if (env.EMAIL_PROVIDER === "resend")
      need(env.RESEND_API_KEY, "RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    if (env.STORAGE_PROVIDER === "supabase")
      need(
        env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_PROVIDER=supabase",
      );
    if (env.TURNSTILE_SITE_KEY || env.TURNSTILE_SECRET_KEY)
      need(
        env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY,
        "Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither",
      );
    if (env.UPSTASH_REDIS_REST_URL || env.UPSTASH_REDIS_REST_TOKEN)
      need(
        env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
        "Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither",
      );
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed lazily so `next build` can run without secrets; instrumentation.ts calls it at server start. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export const isEmailConfigured = () => env().EMAIL_PROVIDER !== "console";
