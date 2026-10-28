import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
test("Workout editor saves atomically, isolates owners and keeps shared snapshots", { skip: process.env.ZET_RUN_WORKOUT_EDIT_TESTS !== "1" }, async () => {
 config({ path: ".env.local", quiet: true });
 const { db } = await import("../lib/db");
 const { user, exercise, exerciseMuscleGroup, workout, workoutSet, communityPost } = await import("../lib/db/schema");
 const { getWorkoutEditVersion, saveWorkoutEdit } = await import("../lib/workout-edit");
 const { getEntries, getWorkoutById } = await import("../lib/workout-store");
 const owner = randomUUID(), other = randomUUID(), id = randomUUID(), foreign = randomUUID(), strength = randomUUID(), variant = randomUUID(), cardio = randomUUID(), hidden = randomUUID();
 try {
  await db.insert(user).values([owner, other].map((id) => ({ id, name: "Edit test", email: `${id}@example.invalid` })));
  await db.insert(exercise).values([{ id: strength, user_id: owner, name: "Strength", type: "strength" }, { id: variant, user_id: owner, name: "Variant", type: "strength" }, { id: cardio, user_id: owner, name: "Cardio", type: "cardio" }, { id: hidden, user_id: other, name: "Private", type: "strength" }]);
  await db.insert(workout).values([{ id, user_id: owner, date: "2026-10-27" }, { id: foreign, user_id: other, date: "2026-10-27" }]);
  const [s] = await db.insert(workoutSet).values({ workout_id: id, exercise_id: strength, reps: 10, weight_kg: 10 }).returning();
  const [f] = await db.insert(workoutSet).values({ workout_id: foreign, exercise_id: hidden, reps: 10, weight_kg: 20 }).returning();
  const snapshot = { date: "2026-10-27", duration: null, strengthSets: 1, cardioSessions: 0, records: [] };
  await db.insert(communityPost).values({ user_id: owner, workout_id: id, summary: snapshot });
  const originalVersion = await getWorkoutEditVersion(owner, id);
  const originalEntries = (await getEntries(owner)).filter((e) => e.workout_id === id);
  const input = { date: "2026-10-28", start: "2026-10-28T10:00", end: "2026-10-28T11:00", notes: "Private edit", entries: [{ ...originalEntries[0], exercise_id: variant, reps: 12, weight_kg: 15 }, { id: randomUUID(), workout_id: id, exercise_id: cardio, kind: "cardio" as const, distance_km: 3.5, duration_sec: 1200 }] };
  await assert.rejects(saveWorkoutEdit(other, id, originalVersion, input));
  await assert.rejects(saveWorkoutEdit(owner, id, originalVersion, { ...input, entries: [{ ...input.entries[0], exercise_id: hidden }] }));
  await assert.rejects(saveWorkoutEdit(owner, id, originalVersion, { ...input, entries: [{ ...input.entries[0], id: f.id }] }));
  assert.equal((await getWorkoutById(owner, id))?.date, "2026-10-27");
  assert.equal((await getEntries(owner)).length, 1);
  await saveWorkoutEdit(owner, id, originalVersion, input);
  assert.equal((await getWorkoutById(owner, id))?.notes, "Private edit");
  assert.equal((await getEntries(owner)).length, 2);
  const [preserved] = await db.select().from(workoutSet).where(eq(workoutSet.id, s.id));
  assert.equal(preserved.exercise_id, variant);
  assert.equal(preserved.created_at.toISOString(), s.created_at.toISOString());
  assert.deepEqual((await db.select().from(communityPost).where(eq(communityPost.workout_id, id)))[0].summary, snapshot);
  await assert.rejects(saveWorkoutEdit(owner, id, originalVersion, input));
  const version = await getWorkoutEditVersion(owner, id);
  await saveWorkoutEdit(owner, id, version, { ...input, entries: [input.entries[1]] });
  assert.equal((await getEntries(owner)).length, 1);
  assert.equal((await getEntries(other)).length, 1);
  const concurrentVersion = await getWorkoutEditVersion(owner, id);
  const concurrent = await Promise.allSettled([
    saveWorkoutEdit(owner, id, concurrentVersion, { ...input, notes: "First", entries: [input.entries[1]] }),
    saveWorkoutEdit(owner, id, concurrentVersion, { ...input, notes: "Second", entries: [input.entries[1]] }),
  ]);
  assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await getEntries(owner)).length, 1);
  await db.insert(exerciseMuscleGroup).values({ exercise_id: strength, muscle_group: "chest" });
  const equipmentVersion = await getWorkoutEditVersion(owner, id);
  const equipmentInput = { ...input, entries: [1, 2].map(() => ({ id: randomUUID(), workout_id: id, exercise_id: strength, kind: "strength" as const, reps: 10, weight_kg: 25, equipment: "cable" as const })) };
  await saveWorkoutEdit(owner, id, equipmentVersion, equipmentInput);
  const variants = (await db.select().from(exercise).where(eq(exercise.user_id, owner))).filter((e) => e.group_name === "Strength" && e.equipment === "cable");
  assert.equal(variants.length, 1);
  assert.equal((await getEntries(owner)).filter((e) => e.exercise_id === variants[0].id).length, 2);
  assert.deepEqual((await db.select().from(exerciseMuscleGroup).where(eq(exerciseMuscleGroup.exercise_id, variants[0].id))).map((g) => g.muscle_group), ["chest"]);
  await assert.rejects(saveWorkoutEdit(owner, id, equipmentVersion, { ...equipmentInput, entries: equipmentInput.entries.map((e) => ({ ...e, equipment: "machine" as const })) }));
  assert.equal((await db.select().from(exercise).where(eq(exercise.user_id, owner))).filter((e) => e.group_name === "Strength" && e.equipment === "machine").length, 0);
  await saveWorkoutEdit(owner, id, await getWorkoutEditVersion(owner, id), equipmentInput);
  assert.equal((await db.select().from(exercise).where(eq(exercise.user_id, owner))).filter((e) => e.group_name === "Strength" && e.equipment === "cable").length, 1);
 } finally {
  await db.delete(workout).where(inArray(workout.user_id, [owner, other]));
  await db.delete(exercise).where(inArray(exercise.user_id, [owner, other]));
  await db.delete(user).where(inArray(user.id, [owner, other]));
 }
});
