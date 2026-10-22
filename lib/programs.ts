// lib/programs.ts
//
// Træningsprogrammer: en navngivet liste af øvelser, til at filtrere
// øvelsesvalget på log-siden. Samme afgrænsningsprincip som
// lib/workout-store.ts: alle funktioner tager userId, og kaldende kode
// henter det fra requireUser(), aldrig fra input.

import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { trainingProgram, trainingProgramExercise } from "@/lib/db/schema";
import type { TrainingProgram } from "@/lib/types";
import { getExercises } from "@/lib/workout-store";

// Egne programmer (uanset status) + andres udgivne programmer. json_agg med
// order by holder styr på øvelsernes rækkefølge, samme teknik som
// getExercises() i workout-store.ts bruger til muskelgrupper.
export async function getPrograms(userId: string): Promise<TrainingProgram[]> {
  return db
    .select({
      id: trainingProgram.id,
      user_id: trainingProgram.user_id,
      name: trainingProgram.name,
      is_published: trainingProgram.is_published,
      exercise_ids: sql<string[]>`coalesce(
        json_agg(${trainingProgramExercise.exercise_id} order by ${trainingProgramExercise.position})
          filter (where ${trainingProgramExercise.exercise_id} is not null),
        '[]'::json
      )`,
    })
    .from(trainingProgram)
    .leftJoin(trainingProgramExercise, eq(trainingProgramExercise.program_id, trainingProgram.id))
    .where(or(eq(trainingProgram.user_id, userId), eq(trainingProgram.is_published, true)))
    .groupBy(trainingProgram.id)
    .orderBy(trainingProgram.created_at);
}

export async function createProgram(
  userId: string,
  data: { name: string; exerciseIds: string[] },
): Promise<TrainingProgram> {
  const name = data.name.trim();
  if (!name || name.length > 100) {
    throw new Error("Navnet skal være mellem 1 og 100 tegn.");
  }
  if (data.exerciseIds.length === 0) {
    throw new Error("Vælg mindst én øvelse.");
  }
  // Et program må kun indeholde øvelser, brugeren rent faktisk kan se
  // (delte øvelser eller egne private), samme tjek som addStrengthEntry.
  const visibleExercises = await getExercises(userId);
  const visibleExerciseIds = new Set(visibleExercises.map((ex) => ex.id));
  const exerciseIds = [...new Set(data.exerciseIds)].filter((id) => visibleExerciseIds.has(id));
  if (exerciseIds.length === 0) {
    throw new Error("Ingen af de valgte øvelser er tilgængelige.");
  }

  const [program] = await db.insert(trainingProgram).values({ user_id: userId, name }).returning();
  await db.insert(trainingProgramExercise).values(
    exerciseIds.map((exercise_id, position) => ({ program_id: program.id, exercise_id, position })),
  );

  return { ...program, exercise_ids: exerciseIds };
}

export async function setProgramPublished(
  userId: string,
  programId: string,
  isPublished: boolean,
): Promise<void> {
  const result = await db.update(trainingProgram)
    .set({ is_published: isPublished })
    .where(and(eq(trainingProgram.id, programId), eq(trainingProgram.user_id, userId)))
    .returning({ id: trainingProgram.id });
  if (!result.length) {
    throw new Error("Programmet findes ikke for denne bruger.");
  }
}

export async function deleteProgram(userId: string, programId: string): Promise<void> {
  const result = await db.delete(trainingProgram)
    .where(and(eq(trainingProgram.id, programId), eq(trainingProgram.user_id, userId)))
    .returning({ id: trainingProgram.id });
  if (!result.length) {
    throw new Error("Programmet findes ikke for denne bruger.");
  }
}
