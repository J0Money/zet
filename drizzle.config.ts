import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit runs as a standalone CLI, outside Next.js, so .env.local isn't
// loaded automatically the way it is during `next dev`/`next build`.
config({ path: ".env.local" });

// Samme forbindelse som appen. Migrationer køres manuelt én ad gangen, aldrig med `drizzle-kit migrate`.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check .env.local.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
