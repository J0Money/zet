// lib/workout-store.ts
//
// All reads and writes query the real database (Postgres/Drizzle). Every
// function takes a userId so call sites don't change signature when real
// login (step 7) replaces the hardcoded user id with a logged-in user's id.

import { and, eq, or, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { SEEDED_USER_ID } from "@/lib/db/constants";
import { exercise, workout as workoutTable, workoutCardio, workoutSet } from "@/lib/db/schema";
import type { CardioEntry, Entry, Exercise, StrengthEntry, Workout } from "@/lib/types";

// Temporary stand-in for a logged-in user's id, until step 7 adds real login.
// Matches the user row lib/db/seed.ts creates in the real database.
export const CURRENT_USER_ID = SEEDED_USER_ID;

// Shared or belonging to this user (user_id null means shared, see
// CLAUDE.md's data model).
export async function getExercises(userId: string): Promise<Exercise[]> {
  return db
    .select()
    .from(exercise)
    .where(or(isNull(exercise.user_id), eq(exercise.user_id, userId)));
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  return db.select().from(workoutTable).where(eq(workoutTable.user_id, userId));
}

export async function getEntries(userId: string): Promise<Entry[]> {
  const strengthRows = await db
    .select({
      id: workoutSet.id,
      workout_id: workoutSet.workout_id,
      exercise_id: workoutSet.exercise_id,
      reps: workoutSet.reps,
      weight_kg: workoutSet.weight_kg,
    })
    .from(workoutSet)
    .innerJoin(workoutTable, eq(workoutSet.workout_id, workoutTable.id))
    .where(eq(workoutTable.user_id, userId));

  const cardioRows = await db
    .select({
      id: workoutCardio.id,
      workout_id: workoutCardio.workout_id,
      exercise_id: workoutCardio.exercise_id,
      distance_km: workoutCardio.distance_km,
      duration_sec: workoutCardio.duration_sec,
    })
    .from(workoutCardio)
    .innerJoin(workoutTable, eq(workoutCardio.workout_id, workoutTable.id))
    .where(eq(workoutTable.user_id, userId));

  const strengthEntries: StrengthEntry[] = strengthRows.map((row) => ({
    kind: "strength",
    ...row,
  }));
  const cardioEntries: CardioEntry[] = cardioRows.map((row) => ({
    kind: "cardio",
    ...row,
  }));

  return [...strengthEntries, ...cardioEntries];
}

// Returns the workout only if it exists and belongs to this user, undefined
// otherwise (both an unknown id and a foreign user's id end up here, so a
// page or write can't use this to guess whether an id exists at all). This
// is the one place "does this user own this workout" is answered, both
// /history/[id] and addStrengthEntry/addCardioEntry below rely on it.
export async function getWorkoutById(
  userId: string,
  workoutId: string,
): Promise<Workout | undefined> {
  const [row] = await db
    .select()
    .from(workoutTable)
    .where(and(eq(workoutTable.id, workoutId), eq(workoutTable.user_id, userId)))
    .limit(1);
  return row;
}

// Reuses the user's workout for that date if one already exists, so sets
// logged one at a time on the same day end up grouped in a single workout.
// A single upsert instead of check-then-insert, relying on the
// (user_id, date) unique constraint: ON CONFLICT DO UPDATE always returns a
// row via .returning(), DO NOTHING would not. The update itself is a no-op,
// it re-assigns user_id to the value it already has, since it's part of the
// conflict target, there is nothing meaningful left to change when the
// workout already exists, we only need *some* column to update so Postgres
// treats this as a real UPDATE instead of skipping it.
export async function getOrCreateWorkoutForDate(
  userId: string,
  date: string,
): Promise<Workout> {
  const [row] = await db
    .insert(workoutTable)
    .values({ user_id: userId, date, notes: "" })
    .onConflictDoUpdate({
      target: [workoutTable.user_id, workoutTable.date],
      set: { user_id: sql`excluded.user_id` },
    })
    .returning();
  return row;
}

export async function addStrengthEntry(
  userId: string,
  data: Omit<StrengthEntry, "id" | "kind">,
): Promise<StrengthEntry> {
  const workout = await getWorkoutById(userId, data.workout_id);
  if (!workout) {
    throw new Error("Workout findes ikke for denne bruger.");
  }

  const [row] = await db
    .insert(workoutSet)
    .values({
      workout_id: data.workout_id,
      exercise_id: data.exercise_id,
      reps: data.reps,
      weight_kg: data.weight_kg,
    })
    .returning();

  return { kind: "strength", ...row };
}

export async function addCardioEntry(
  userId: string,
  data: Omit<CardioEntry, "id" | "kind">,
): Promise<CardioEntry> {
  const workout = await getWorkoutById(userId, data.workout_id);
  if (!workout) {
    throw new Error("Workout findes ikke for denne bruger.");
  }

  const [row] = await db
    .insert(workoutCardio)
    .values({
      workout_id: data.workout_id,
      exercise_id: data.exercise_id,
      distance_km: data.distance_km,
      duration_sec: data.duration_sec,
    })
    .returning();

  return { kind: "cardio", ...row };
}
