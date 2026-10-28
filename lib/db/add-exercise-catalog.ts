// lib/db/add-exercise-catalog.ts
//
// Tilføjer flere delte øvelser med muskelgruppe-tags, uden at røre dem der
// allerede findes. I modsætning til seed.ts (som kun kører på en helt tom
// database) tjekker dette script øvelse for øvelse på navn, så det er trygt
// at køre flere gange, også på en database med rigtige brugere og data.
// Kør med `npm run db:add-exercises`.

import { config } from "dotenv";

// Standalone script via tsx, uden for Next.js, så .env.local skal loades
// manuelt, før ./index importeres (den læser DATABASE_URL ved import).
config({ path: ".env.local" });

import { isNull } from "drizzle-orm";
import { exercise, exerciseMuscleGroup } from "./schema";
import type { MuscleGroup } from "@/lib/types";
import type { db as DbClient } from "./index";

type Db = typeof DbClient;

const EXERCISE_CATALOG: { name: string; type: "strength" | "cardio"; muscleGroups: MuscleGroup[] }[] = [
  { name: "Incline bench press", type: "strength", muscleGroups: ["chest", "shoulders"] },
  { name: "Dips", type: "strength", muscleGroups: ["chest", "triceps"] },
  { name: "Flyes (Cable)", type: "strength", muscleGroups: ["chest"] },
  { name: "Machine chest press", type: "strength", muscleGroups: ["chest"] },
  { name: "Deadlift", type: "strength", muscleGroups: ["back", "legs", "core"] },
  { name: "Pull-ups", type: "strength", muscleGroups: ["back", "biceps"] },
  { name: "Lat pulldown", type: "strength", muscleGroups: ["back", "biceps"] },
  { name: "Standing cable row", type: "strength", muscleGroups: ["back"] },
  { name: "Back extension", type: "strength", muscleGroups: ["back", "core"] },
  { name: "Lateral raise", type: "strength", muscleGroups: ["shoulders"] },
  { name: "Front raise", type: "strength", muscleGroups: ["shoulders"] },
  { name: "Reverse fly", type: "strength", muscleGroups: ["shoulders", "back"] },
  { name: "Shrugs", type: "strength", muscleGroups: ["shoulders"] },
  { name: "Biceps curl", type: "strength", muscleGroups: ["biceps"] },
  { name: "Hammer curl", type: "strength", muscleGroups: ["biceps"] },
  { name: "Concentration curl", type: "strength", muscleGroups: ["biceps"] },
  { name: "Triceps pushdown", type: "strength", muscleGroups: ["triceps"] },
  { name: "French press", type: "strength", muscleGroups: ["triceps"] },
  { name: "Lunges", type: "strength", muscleGroups: ["legs"] },
  { name: "Leg press", type: "strength", muscleGroups: ["legs"] },
  { name: "Leg extension", type: "strength", muscleGroups: ["legs"] },
  { name: "Leg curl", type: "strength", muscleGroups: ["legs"] },
  { name: "Hip thrust", type: "strength", muscleGroups: ["legs"] },
  { name: "Calf raise", type: "strength", muscleGroups: ["legs"] },
  { name: "Bulgarian split squat", type: "strength", muscleGroups: ["legs", "core"] },
  { name: "Plank", type: "strength", muscleGroups: ["core"] },
  { name: "Sit-ups", type: "strength", muscleGroups: ["core"] },
  { name: "Hanging leg raise", type: "strength", muscleGroups: ["core"] },
  { name: "Russian twists", type: "strength", muscleGroups: ["core"] },
  { name: "Cycling", type: "cardio", muscleGroups: ["legs"] },
  { name: "Rowing machine", type: "cardio", muscleGroups: ["full_body"] },
  { name: "Swimming", type: "cardio", muscleGroups: ["full_body"] },
  { name: "Crosstrainer", type: "cardio", muscleGroups: ["full_body"] },
  { name: "Stair climber", type: "cardio", muscleGroups: ["legs"] },
  { name: "Jump rope", type: "cardio", muscleGroups: ["full_body"] },
];

async function main() {
  const { db }: { db: Db } = await import("./index");

  const existing = await db.select({ name: exercise.name }).from(exercise).where(isNull(exercise.user_id));
  const existingNames = new Set(existing.map((row) => row.name));
  const toInsert = EXERCISE_CATALOG.filter((item) => !existingNames.has(item.name));

  if (toInsert.length === 0) {
    console.log("Alle øvelser i kataloget findes allerede som delte øvelser. Intet tilføjet.");
    return;
  }

  // Postgres bevarer rækkefølgen fra VALUES i RETURNING for et almindeligt
  // multi-row INSERT, så index i kan bruges til at matche inserted[i] med
  // toInsert[i] og slå de rigtige tags op.
  const inserted = await db.insert(exercise)
    .values(toInsert.map((item) => ({ user_id: null, name: item.name, type: item.type })))
    .returning();

  const tagRows = inserted.flatMap((row, i) =>
    toInsert[i].muscleGroups.map((muscle_group) => ({ exercise_id: row.id, muscle_group })),
  );
  await db.insert(exerciseMuscleGroup).values(tagRows);

  console.log(`Tilføjede ${inserted.length} nye øvelser med i alt ${tagRows.length} muskelgruppe-tags.`);
}

main();
