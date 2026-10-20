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
  { name: "Skråbænkpres", type: "strength", muscleGroups: ["chest", "shoulders"] },
  { name: "Dips", type: "strength", muscleGroups: ["chest", "triceps"] },
  { name: "Flyes (kabel)", type: "strength", muscleGroups: ["chest"] },
  { name: "Brystpres i maskine", type: "strength", muscleGroups: ["chest"] },
  { name: "Dødløft", type: "strength", muscleGroups: ["back", "legs", "core"] },
  { name: "Pull-ups", type: "strength", muscleGroups: ["back", "biceps"] },
  { name: "Lat-træk", type: "strength", muscleGroups: ["back", "biceps"] },
  { name: "Stående ro i kabel", type: "strength", muscleGroups: ["back"] },
  { name: "Rygstrækninger", type: "strength", muscleGroups: ["back", "core"] },
  { name: "Sidehævninger", type: "strength", muscleGroups: ["shoulders"] },
  { name: "Frontløft", type: "strength", muscleGroups: ["shoulders"] },
  { name: "Omvendt flyes", type: "strength", muscleGroups: ["shoulders", "back"] },
  { name: "Skuldertræk", type: "strength", muscleGroups: ["shoulders"] },
  { name: "Biceps curl", type: "strength", muscleGroups: ["biceps"] },
  { name: "Hammer curl", type: "strength", muscleGroups: ["biceps"] },
  { name: "Koncentrationscurl", type: "strength", muscleGroups: ["biceps"] },
  { name: "Triceps pushdown", type: "strength", muscleGroups: ["triceps"] },
  { name: "Fransk pres", type: "strength", muscleGroups: ["triceps"] },
  { name: "Udfald", type: "strength", muscleGroups: ["legs"] },
  { name: "Benpres", type: "strength", muscleGroups: ["legs"] },
  { name: "Benstrækker", type: "strength", muscleGroups: ["legs"] },
  { name: "Benbøjer", type: "strength", muscleGroups: ["legs"] },
  { name: "Hip thrust", type: "strength", muscleGroups: ["legs"] },
  { name: "Vadebøjninger", type: "strength", muscleGroups: ["legs"] },
  { name: "Bulgarian split squat", type: "strength", muscleGroups: ["legs", "core"] },
  { name: "Planke", type: "strength", muscleGroups: ["core"] },
  { name: "Mavebøjninger", type: "strength", muscleGroups: ["core"] },
  { name: "Hængende benløft", type: "strength", muscleGroups: ["core"] },
  { name: "Russian twists", type: "strength", muscleGroups: ["core"] },
  { name: "Cykling", type: "cardio", muscleGroups: ["legs"] },
  { name: "Romaskine", type: "cardio", muscleGroups: ["full_body"] },
  { name: "Svømning", type: "cardio", muscleGroups: ["full_body"] },
  { name: "Crosstrainer", type: "cardio", muscleGroups: ["full_body"] },
  { name: "Trappemaskine", type: "cardio", muscleGroups: ["legs"] },
  { name: "Hop i reb", type: "cardio", muscleGroups: ["full_body"] },
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
