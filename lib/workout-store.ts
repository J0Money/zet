// lib/workout-store.ts
//
// Alle læsninger og skrivninger afgrænses til userId. Sider og Server Actions
// henter dette id fra requireUser(), aldrig fra formularer eller URL-parametre.

import "server-only";
import { and, eq, or, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercise, exerciseMuscleGroup, workout as workoutTable, workoutCardio, workoutSet } from "@/lib/db/schema";
import type { CardioEntry, Entry, Exercise, MuscleGroup, StrengthEntry, Workout } from "@/lib/types";

// Shared or belonging to this user (user_id null means shared, see
// CLAUDE.md's data model). En øvelse kan have flere muskelgrupper, derfor en
// left join: json_agg samler dem i én liste pr. øvelse, og filter udelader
// null, når en øvelse (endnu) ikke har nogen tags. array_agg ville virke i
// ren SQL, men neon-http-driveren parser ikke Postgres' array-tekstformat
// til et JS-array, json_agg giver json, som driveren parser korrekt.
export async function getExercises(userId: string): Promise<Exercise[]> {
  return db
    .select({
      id: exercise.id,
      user_id: exercise.user_id,
      name: exercise.name,
      type: exercise.type,
      muscle_groups: sql<MuscleGroup[]>`coalesce(json_agg(${exerciseMuscleGroup.muscle_group}) filter (where ${exerciseMuscleGroup.muscle_group} is not null), '[]'::json)`,
    })
    .from(exercise)
    .leftJoin(exerciseMuscleGroup, eq(exerciseMuscleGroup.exercise_id, exercise.id))
    .where(or(isNull(exercise.user_id), eq(exercise.user_id, userId)))
    .groupBy(exercise.id);
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workoutId)) {
    return undefined;
  }
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
  const exercises = await getExercises(userId);
  if (!exercises.some((exercise) => exercise.id === data.exercise_id && exercise.type === "strength")) {
    throw new Error("Styrkeøvelsen er ikke tilgængelig for denne bruger.");
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

// Flere sæt af samme øvelse i ét kald (fx 3 sæt med forskellig vægt/reps),
// gemt i ét bulk-insert, så enten gemmes alle sæt, eller ingen af dem.
export async function addStrengthEntries(
  userId: string,
  data: {
    workout_id: string;
    exercise_id: string;
    sets: { reps: number; weight_kg: number }[];
  },
): Promise<StrengthEntry[]> {
  const workout = await getWorkoutById(userId, data.workout_id);
  if (!workout) {
    throw new Error("Workout findes ikke for denne bruger.");
  }
  const exercises = await getExercises(userId);
  if (!exercises.some((exercise) => exercise.id === data.exercise_id && exercise.type === "strength")) {
    throw new Error("Styrkeøvelsen er ikke tilgængelig for denne bruger.");
  }

  const rows = await db
    .insert(workoutSet)
    .values(data.sets.map((set) => ({
      workout_id: data.workout_id,
      exercise_id: data.exercise_id,
      reps: set.reps,
      weight_kg: set.weight_kg,
    })))
    .returning();

  return rows.map((row) => ({ kind: "strength" as const, ...row }));
}

export async function addCardioEntry(
  userId: string,
  data: Omit<CardioEntry, "id" | "kind">,
): Promise<CardioEntry> {
  const workout = await getWorkoutById(userId, data.workout_id);
  if (!workout) {
    throw new Error("Workout findes ikke for denne bruger.");
  }
  const exercises = await getExercises(userId);
  if (!exercises.some((exercise) => exercise.id === data.exercise_id && exercise.type === "cardio")) {
    throw new Error("Cardioøvelsen er ikke tilgængelig for denne bruger.");
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
