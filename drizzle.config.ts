import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit runs as a standalone CLI, outside Next.js, so .env.local isn't
// loaded automatically the way it is during `next dev`/`next build`.
config({ path: ".env.local" });

// Migrations run DDL over a direct connection, not the pooled one the app
// uses at runtime (lib/db/index.ts). Neon recommends this for drizzle-kit.
if (!process.env.DIRECT_DATABASE_URL) {
  throw new Error("DIRECT_DATABASE_URL is not set. Check .env.local.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL,
  },
});
