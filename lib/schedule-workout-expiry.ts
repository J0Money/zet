import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { publishWorkoutExpiry } from "./workout-expiry-publisher";

export async function scheduleWorkoutExpiry(userId: string, workoutId: string): Promise<string | undefined> {
  // Lokal udvikling/preview må aldrig sende opgaver til produktion.
  if (process.env.VERCEL_ENV !== "production") return;
  try {
    const result = await db.execute(sql`
      SELECT ceil(extract(epoch FROM (max(s.created_at) AT TIME ZONE 'UTC')) + 3600)::bigint AS deadline
      FROM workout w JOIN workout_set s ON s.workout_id = w.id
      WHERE w.id = ${workoutId} AND w.user_id = ${userId}
        AND w.started_at IS NOT NULL AND w.ended_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM workout_cardio c WHERE c.workout_id = w.id)
      HAVING count(*) > 0
    `);
    if (!result.rows.length) return;
    await publishWorkoutExpiry(workoutId, Number(result.rows[0].deadline), {
      token: process.env.QSTASH_TOKEN ?? "",
      secret: process.env.WORKOUT_EXPIRY_SECRET ?? "",
      callbackUrl: "https://zet-wheat.vercel.app/api/workouts/expire",
    });
    return;
  } catch {
    return "Sættene er gemt, men automatisk afslutning kunne ikke planlægges. Afslut dette pas manuelt.";
  }
}
