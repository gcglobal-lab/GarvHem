import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection. On Supabase/Neon set DIRECT_URL to the
    // non-pooled connection string; locally DATABASE_URL is enough.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
