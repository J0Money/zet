// lib/db/index.ts
//
// Database client, built on Neon's HTTP driver (drizzle-orm/neon-http).
// Each query is a plain HTTP request, no long-lived connection to run out
// of, which is what makes this safe to use from Vercel's serverless
// functions. DATABASE_URL comes from .env.local (Next.js loads it
// automatically), never hardcode it here.

import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check .env.local.");
}

export const db = drizzle(process.env.DATABASE_URL);
