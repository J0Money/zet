import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";

test("Kun inaktive rene styrkepas afsluttes ved sidste sæt", { skip: process.env.ZET_RUN_EXPIRY_TESTS !== "1" }, async () => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, exercise, workout, workoutSet, workoutCardio } = await import("../lib/db/schema");
  const { closeExpiredStrengthWorkouts } = await import("../lib/workout-expiry");
  const owner = randomUUID(), other = randomUUID(), strength = randomUUID(), cardio = randomUUID();
  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * 60000);
  try {
    await db.insert(user).values([owner, other].map(id => ({ id, name: "Expiry test", email: `${id}@example.invalid` })));
    await db.insert(exercise).values([{ id: strength, user_id: owner, name: "Expiry strength", type: "strength" }, { id: cardio, user_id: owner, name: "Expiry cardio", type: "cardio" }]);
    const foreign = randomUUID();
    await db.insert(workout).values({ id: foreign, user_id: other, date: "2026-10-29", started_at: ago(180) });
    await db.insert(workoutSet).values({ workout_id: foreign, exercise_id: strength, reps: 10, weight_kg: 20, created_at: ago(90) });
    for (const scenario of ["expired", "recent", "mixed", "cardio", "empty", "finished", "reset"] as const) {
      const id = randomUUID();
      const originalEnd = scenario === "finished" ? ago(80) : null;
      await db.insert(workout).values({ id, user_id: owner, date: "2026-10-29", started_at: ago(180), ended_at: originalEnd });
      if (!["empty", "cardio"].includes(scenario)) {
        await db.insert(workoutSet).values({ workout_id: id, exercise_id: strength, reps: 10, weight_kg: 20, created_at: ago(scenario === "recent" ? 59 : 90) });
      }
      if (scenario === "reset") await db.insert(workoutSet).values({ workout_id: id, exercise_id: strength, reps: 10, weight_kg: 20, created_at: ago(5) });
      if (scenario === "mixed" || scenario === "cardio") await db.insert(workoutCardio).values({ workout_id: id, exercise_id: cardio, distance_km: 2, duration_sec: 600, created_at: ago(90) });
      await closeExpiredStrengthWorkouts(owner);
      await closeExpiredStrengthWorkouts(owner);
      const [saved] = await db.select().from(workout).where(eq(workout.id, id));
      assert.equal(saved.ended_at?.toISOString() ?? null, scenario === "expired" ? ago(90).toISOString() : originalEnd?.toISOString() ?? null, scenario);
      await db.delete(workout).where(eq(workout.id, id));
    }
    const [untouched] = await db.select().from(workout).where(eq(workout.id, foreign));
    assert.equal(untouched.ended_at, null);
    await closeExpiredStrengthWorkouts(undefined, foreign);
    const [closed] = await db.select().from(workout).where(eq(workout.id, foreign));
    assert.equal(closed.ended_at?.toISOString(), ago(90).toISOString());
    await assert.rejects(closeExpiredStrengthWorkouts(undefined));
    const { POST } = await import("../app/api/workouts/expire/route");
    assert.equal((await POST(new Request("http://localhost/api/workouts/expire"))).status, 401);
    assert.equal((await POST(new Request("http://localhost/api/workouts/expire", { headers: { authorization: "Bearer wrong" } }))).status, 401);
  } finally {
    await db.delete(workout).where(inArray(workout.user_id, [owner, other]));
    await db.delete(exercise).where(inArray(exercise.id, [strength, cardio]));
    await db.delete(user).where(inArray(user.id, [owner, other]));
  }
});
