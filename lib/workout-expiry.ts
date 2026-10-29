import "server-only";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "./db";

// Fælles regel for servertjek og genåbning af appen. Tomme pas og pas med
// cardio berøres aldrig. Sluttiden er sidste styrkesæt, ikke tjekkets tid.
export async function closeExpiredStrengthWorkouts(userId: string | undefined, workoutId?: string): Promise<void> {
  if (!userId && !workoutId) throw new Error("Afslutning kræver bruger eller pas.");
  const query = new PgDialect().sqlToQuery(sql`
    UPDATE workout AS w SET ended_at = a.last_set
    FROM (
      SELECT w2.id, max(s.created_at) AT TIME ZONE 'UTC' AS last_set
      FROM workout w2 JOIN workout_set s ON s.workout_id = w2.id
      WHERE w2.started_at IS NOT NULL AND w2.ended_at IS NULL
        AND ${userId ? sql`w2.user_id = ${userId}` : sql`true`}
        AND ${workoutId ? sql`w2.id = ${workoutId}` : sql`true`}
        AND NOT EXISTS (SELECT 1 FROM workout_cardio c WHERE c.workout_id = w2.id)
      GROUP BY w2.id
    ) a
    WHERE w.id = a.id AND w.ended_at IS NULL
      AND a.last_set >= w.started_at
      AND a.last_set <= now() - interval '1 hour'
  `);
  // Korte tabel-låse sikrer, at et samtidigt nyt sæt eller cardio ikke bliver
  // overset mellem læsning og afslutning. Neon understøtter denne samlede
  // ikke-interaktive transaktion. Ingen låse holdes mellem HTTP-kald.
  await db.$client.transaction([
    db.$client.query("SET LOCAL lock_timeout = '3s'"),
    db.$client.query("LOCK TABLE workout, workout_set, workout_cardio IN SHARE ROW EXCLUSIVE MODE"),
    db.$client.query(query.sql, query.params),
  ]);
}
