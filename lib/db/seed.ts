// lib/db/seed.ts
//
// One-time setup for a fresh database: a user, the shared exercises, and
// (separately) a few demo workouts so the dashboard isn't empty on first
// look. Run with `npm run db:seed`.
//
// Idempotent: if any user already exists, the whole script skips (both the
// base seed and the demo workouts), so running it twice never creates
// duplicates.

import { config } from "dotenv";

// This script runs standalone via tsx, outside Next.js, so .env.local isn't
// loaded automatically. Must happen before ./index is imported (it reads
// DATABASE_URL at import time), but regular imports are hoisted above any
// code in this file, so ./index is loaded dynamically further down instead.
config({ path: ".env.local" });

import { SEEDED_USER_ID } from "./constants";
import { exercise, exerciseMuscleGroup, user, workout, workoutCardio, workoutSet } from "./schema";
import { getTodayInCopenhagen } from "@/lib/dates";
import type { db as DbClient } from "./index";

type Db = typeof DbClient;

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function seedUsersAndExercises(db: Db) {
  const [joe] = await db
    .insert(user)
    .values({ id: SEEDED_USER_ID, email: "joe@example.com", name: "Joe" })
    .returning();

  await db.insert(user).values({ email: "friend@example.com", name: "Alex" });

  const insertedExercises = await db
    .insert(exercise)
    .values([
      { user_id: null, name: "Bench press", type: "strength" },
      { user_id: null, name: "Squat", type: "strength" },
      { user_id: null, name: "Machine row", type: "strength" },
      { user_id: null, name: "Shoulder press", type: "strength" },
      { user_id: null, name: "Running", type: "cardio" },
    ])
    .returning();

  const exerciseIdByName = new Map(
    insertedExercises.map((exercise) => [exercise.name, exercise.id]),
  );

  await db.insert(exerciseMuscleGroup).values([
    { exercise_id: exerciseIdByName.get("Bench press")!, muscle_group: "chest" },
    { exercise_id: exerciseIdByName.get("Squat")!, muscle_group: "legs" },
    { exercise_id: exerciseIdByName.get("Machine row")!, muscle_group: "back" },
    { exercise_id: exerciseIdByName.get("Shoulder press")!, muscle_group: "shoulders" },
    { exercise_id: exerciseIdByName.get("Running")!, muscle_group: "full_body" },
  ]);

  console.log(`Seedet bruger "${joe.name}" og ${insertedExercises.length} øvelser.`);
  return { userId: joe.id, exerciseIdByName };
}

// Separat funktion, så demo-workouts kan fjernes (slet kaldet i main()) uden
// at røre bruger/øvelse-seedingen ovenfor.
async function seedDemoWorkouts(
  db: Db,
  userId: string,
  exerciseIdByName: Map<string, string>,
) {
  const today = new Date(getTodayInCopenhagen());
  const thisWeekStart = startOfWeek(today);

  // Samme ugedag-afstand til ugestarten som i det oprindelige demo-datasæt:
  // to træninger for to uger siden (tirsdag + fredag), én sidste uge
  // (tirsdag), én denne uge (tirsdag).
  const dateA = toDateString(addDays(thisWeekStart, -13));
  const dateB = toDateString(addDays(thisWeekStart, -10));
  const dateC = toDateString(addDays(thisWeekStart, -6));
  const dateD = toDateString(addDays(thisWeekStart, 1));

  const bænkpres = exerciseIdByName.get("Bench press")!;
  const squat = exerciseIdByName.get("Squat")!;
  const ro = exerciseIdByName.get("Machine row")!;
  const skulderpres = exerciseIdByName.get("Shoulder press")!;
  const løb = exerciseIdByName.get("Running")!;

  const [workoutA, workoutB, workoutC, workoutD] = await db
    .insert(workout)
    .values([
      { user_id: userId, date: dateA, notes: "Første uge, føler mig frisk" },
      { user_id: userId, date: dateB, notes: "" },
      { user_id: userId, date: dateC, notes: "Løbetur i regnvejr" },
      { user_id: userId, date: dateD, notes: "" },
    ])
    .returning();

  await db.insert(workoutSet).values([
    { workout_id: workoutA.id, exercise_id: bænkpres, reps: 8, weight_kg: 60 },
    { workout_id: workoutA.id, exercise_id: bænkpres, reps: 8, weight_kg: 60 },
    { workout_id: workoutA.id, exercise_id: squat, reps: 6, weight_kg: 80 },
    { workout_id: workoutB.id, exercise_id: ro, reps: 10, weight_kg: 45 },
    { workout_id: workoutB.id, exercise_id: skulderpres, reps: 8, weight_kg: 30 },
    { workout_id: workoutD.id, exercise_id: bænkpres, reps: 8, weight_kg: 62.5 },
    { workout_id: workoutD.id, exercise_id: bænkpres, reps: 7, weight_kg: 62.5 },
  ]);

  await db.insert(workoutCardio).values([
    { workout_id: workoutC.id, exercise_id: løb, distance_km: 5.2, duration_sec: 1560 },
    { workout_id: workoutD.id, exercise_id: løb, distance_km: 3, duration_sec: 900 },
  ]);

  console.log("Seedet 4 demo-workouts.");
}

async function main() {
  const { db } = await import("./index");

  const existingUsers = await db.select().from(user).limit(1);
  if (existingUsers.length > 0) {
    console.log("Der findes allerede brugere i databasen, springer seed over.");
    return;
  }

  const { userId, exerciseIdByName } = await seedUsersAndExercises(db);
  await seedDemoWorkouts(db, userId, exerciseIdByName);
}

main();
