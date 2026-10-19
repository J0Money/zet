// lib/db/schema.ts
//
// Mirrors the data model in CLAUDE.md. uuid primary keys match the existing
// `id: string` TypeScript types and crypto.randomUUID() usage, so nothing in
// lib/types.ts needs to change.

import { sql } from "drizzle-orm";
import {
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const exerciseType = pgEnum("exercise_type", ["strength", "cardio"]);

export const muscleGroup = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "full_body",
]);

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
});

export const exercise = pgTable("exercise", {
  id: uuid("id").primaryKey().defaultRandom(),
  // null means shared across all users.
  user_id: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: exerciseType("type").notNull(),
  muscle_group: muscleGroup("muscle_group").notNull(),
});

export const workout = pgTable(
  "workout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // { mode: "string" } keeps this a plain "YYYY-MM-DD" string in
    // TypeScript, matching Workout.date and
    // formatDateDanish()/getTodayInCopenhagen().
    date: date("date", { mode: "string" }).notNull(),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    // One workout per user per day. Lets getOrCreateWorkoutForDate use a
    // single upsert instead of a check-then-insert that could race.
    unique("workout_user_id_date_unique").on(table.user_id, table.date),
  ],
);

export const workoutSet = pgTable("workout_set", {
  id: uuid("id").primaryKey().defaultRandom(),
  workout_id: uuid("workout_id")
    .notNull()
    .references(() => workout.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id")
    .notNull()
    .references(() => exercise.id),
  reps: integer("reps").notNull(),
  weight_kg: doublePrecision("weight_kg").notNull(),
  // Orders sets within an exercise/workout: "Sæt 1, Sæt 2, ..." by insertion
  // order. A plain SELECT has no guaranteed row order without this.
  // clock_timestamp() (not now()) advances per row even within one
  // transaction/statement, now() is frozen for the whole transaction, which
  // would give identical timestamps when seeding several sets at once.
  created_at: timestamp("created_at")
    .notNull()
    .default(sql`clock_timestamp()`),
});

export const workoutCardio = pgTable("workout_cardio", {
  id: uuid("id").primaryKey().defaultRandom(),
  workout_id: uuid("workout_id")
    .notNull()
    .references(() => workout.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id")
    .notNull()
    .references(() => exercise.id),
  distance_km: doublePrecision("distance_km").notNull(),
  duration_sec: integer("duration_sec").notNull(),
  created_at: timestamp("created_at")
    .notNull()
    .default(sql`clock_timestamp()`),
});
