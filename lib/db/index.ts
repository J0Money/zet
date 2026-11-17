// lib/db/index.ts
//
// Databaseklient over node-postgres med en forbindelsespulje, da appen kører
// som en langtlevende server på Railway. DATABASE_URL kommer fra .env.local
// eller Railways variabler, aldrig hardkodet her.

import { drizzle } from "drizzle-orm/node-postgres";
import { createSqlClient, type SqlClient } from "./client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check .env.local.");
}

// Én pulje pr. proces, også når udviklingsserveren genindlæser moduler.
const globalForDb = globalThis as unknown as { zetSql?: SqlClient };
export const sqlClient = (globalForDb.zetSql ??= createSqlClient(process.env.DATABASE_URL));
export const db = drizzle(sqlClient.pool);
export { statement, type Statement } from "./client";
