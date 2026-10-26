// lib/workout-store.ts
//
// Alle læsninger og skrivninger afgrænses til userId. Sider og Server Actions
// henter dette id fra requireUser(), aldrig fra formularer eller URL-parametre.

import "server-only";
import { and, eq, or, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercise, exerciseMuscleGroup, workout as workoutTable, workoutCardio, workoutSet } from "@/lib/db/schema";
import type { CardioEntry, Entry, Equipment, Exercise, ExerciseType, MuscleGroup, StrengthEntry, Workout } from "@/lib/types";

// Synlige øvelser: indbyggede (user_id null), brugerens egne, og andre
// brugeres øvelser, der er delt (is_shared), se CLAUDE.md's datamodel. En øvelse kan have flere muskelgrupper, derfor en
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
      group_name: exercise.group_name,
      equipment: exercise.equipment,
      muscle_groups: sql<MuscleGroup[]>`coalesce(json_agg(${exerciseMuscleGroup.muscle_group}) filter (where ${exerciseMuscleGroup.muscle_group} is not null), '[]'::json)`,
    })
    .from(exercise)
    .leftJoin(exerciseMuscleGroup, eq(exerciseMuscleGroup.exercise_id, exercise.id))
    .where(or(isNull(exercise.user_id), eq(exercise.user_id, userId), eq(exercise.is_shared, true)))
    .groupBy(exercise.id);
}

// Opretter en øvelse, der er delt med alle (is_shared), men stadig kender sin
// ejer (user_id). Den opfører sig derefter som enhver anden øvelse: den kan
// vælges igen, og den tæller med i personlige rekorder, volumen osv. Dubletter tjekkes af
// kaldende kode (app/log/actions.ts), ikke her, da det kræver den fulde,
// synlige øvelsesliste.
export async function createExercise(
  userId: string,
  input: {
    name: string;
    type: ExerciseType;
    muscleGroups: MuscleGroup[];
    groupName: string | null;
    equipment: Equipment | null;
  },
): Promise<Exercise> {
  const [created] = await db
    .insert(exercise)
    .values({
      user_id: userId,
      name: input.name,
      type: input.type,
      is_shared: true,
      group_name: input.groupName,
      equipment: input.equipment,
    })
    .returning();

  if (input.muscleGroups.length > 0) {
    await db.insert(exerciseMuscleGroup).values(
      input.muscleGroups.map((muscle_group) => ({ exercise_id: created.id, muscle_group })),
    );
  }

  return {
    id: created.id,
    user_id: created.user_id,
    name: created.name,
    type: created.type,
    muscle_groups: input.muscleGroups,
    group_name: created.group_name,
    equipment: created.equipment,
  };
}

// Tidspunkterne gives videre som ISO-tekst, så de kan sendes som props til
// klientkomponenter, og så resten af koden ikke skal kende Drizzles Date-type.
function toWorkout(row: typeof workoutTable.$inferSelect): Workout {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    notes: row.notes,
    started_at: row.started_at ? row.started_at.toISOString() : null,
    ended_at: row.ended_at ? row.ended_at.toISOString() : null,
  };
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const rows = await db.select().from(workoutTable).where(eq(workoutTable.user_id, userId));
  return rows.map(toWorkout);
}

export async function getEntries(userId: string): Promise<Entry[]> {
  // Sorteret efter created_at: "Sæt 1, Sæt 2, ..." afspejler rækkefølgen,
  // sættene blev logget i, og ændrer sig ikke, hvis et sæt rettes bagefter
  // (en UPDATE kan ellers flytte rækkens fysiske plads i en usorteret SELECT).
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
    .where(eq(workoutTable.user_id, userId))
    .orderBy(workoutSet.created_at);

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
    .where(eq(workoutTable.user_id, userId))
    .orderBy(workoutCardio.created_at);

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
  return row ? toWorkout(row) : undefined;
}

// Et pas, der ikke har fået en eneste registrering i så lang tid, regnes for
// glemt og lukkes af sig selv, med sluttidspunktet sat til den seneste
// registrering (eller starten, hvis der ingen er). Det sker i én SQL-sætning.
// created_at på sæt og cardio er uden tidszone og gemt i databasens tid (UTC
// hos Neon), derfor AT TIME ZONE 'UTC'.
const STALE_AFTER_HOURS = 12;

async function closeStaleWorkouts(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE workout AS w
    SET ended_at = a.last_activity
    FROM (
      SELECT w2.id,
        greatest(
          w2.started_at,
          (SELECT max(created_at) FROM workout_set WHERE workout_id = w2.id) AT TIME ZONE 'UTC',
          (SELECT max(created_at) FROM workout_cardio WHERE workout_id = w2.id) AT TIME ZONE 'UTC'
        ) AS last_activity
      FROM workout AS w2
      WHERE w2.user_id = ${userId} AND w2.started_at IS NOT NULL AND w2.ended_at IS NULL
    ) AS a
    WHERE w.id = a.id AND a.last_activity < now() - make_interval(hours => ${STALE_AFTER_HOURS})
  `);
}

// Det pas, brugeren er i gang med, eller undefined.
export async function getActiveWorkout(userId: string): Promise<Workout | undefined> {
  await closeStaleWorkouts(userId);
  const [row] = await db
    .select()
    .from(workoutTable)
    .where(
      and(
        eq(workoutTable.user_id, userId),
        isNotNull(workoutTable.started_at),
        isNull(workoutTable.ended_at),
      ),
    )
    .limit(1);
  return row ? toWorkout(row) : undefined;
}

// Starter et nyt pas, eller returnerer det aktive, hvis der allerede er et.
// Højst ét aktivt pas pr. bruger håndhæves af en unik delvis indeks i databasen
// (workout_one_active_per_user), så ON CONFLICT DO NOTHING er nok: taber vi et
// kapløb (fx to hurtige tryk på "Start"), hentes det pas, der vandt.
export async function getOrStartActiveWorkout(userId: string, today: string): Promise<Workout> {
  const active = await getActiveWorkout(userId);
  if (active) return active;

  const [inserted] = await db
    .insert(workoutTable)
    .values({ user_id: userId, date: today, notes: "", started_at: sql`now()` })
    .onConflictDoNothing()
    .returning();
  if (inserted) return toWorkout(inserted);

  const raced = await getActiveWorkout(userId);
  if (!raced) throw new Error("Kunne ikke starte et træningspas.");
  return raced;
}

// Afslutter det aktive pas. Returnerer false, hvis der ikke var et.
export async function endActiveWorkout(userId: string, workoutId?: string): Promise<boolean> {
  const rows = await db
    .update(workoutTable)
    .set({ ended_at: sql`now()` })
    .where(
      and(
        eq(workoutTable.user_id, userId),
        isNotNull(workoutTable.started_at),
        isNull(workoutTable.ended_at),
        workoutId ? eq(workoutTable.id, workoutId) : undefined,
      ),
    )
    .returning({ id: workoutTable.id });
  return rows.length > 0;
}

// Opretter en afsluttet træning uden starttid på en given dag. Kun til test og
// engangsscripts, appen selv starter pas via getOrStartActiveWorkout.
export async function createWorkoutOnDate(userId: string, date: string): Promise<Workout> {
  const [row] = await db
    .insert(workoutTable)
    .values({ user_id: userId, date, notes: "" })
    .returning();
  return toWorkout(row);
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

// Finder det workout_id, et sæt/en cardio-registrering hører til, så
// ejerskab kan tjekkes via getWorkoutById, samme mønster som add*Entry.
async function getStrengthEntryWorkoutId(entryId: string): Promise<string | undefined> {
  const [row] = await db.select({ workout_id: workoutSet.workout_id }).from(workoutSet)
    .where(eq(workoutSet.id, entryId)).limit(1);
  return row?.workout_id;
}

async function getCardioEntryWorkoutId(entryId: string): Promise<string | undefined> {
  const [row] = await db.select({ workout_id: workoutCardio.workout_id }).from(workoutCardio)
    .where(eq(workoutCardio.id, entryId)).limit(1);
  return row?.workout_id;
}

export async function updateStrengthEntry(
  userId: string,
  entryId: string,
  data: { reps: number; weight_kg: number },
): Promise<void> {
  const workoutId = await getStrengthEntryWorkoutId(entryId);
  if (!workoutId || !(await getWorkoutById(userId, workoutId))) {
    throw new Error("Sættet findes ikke for denne bruger.");
  }
  await db.update(workoutSet)
    .set({ reps: data.reps, weight_kg: data.weight_kg })
    .where(eq(workoutSet.id, entryId));
}

export async function deleteStrengthEntry(userId: string, entryId: string): Promise<void> {
  const workoutId = await getStrengthEntryWorkoutId(entryId);
  if (!workoutId || !(await getWorkoutById(userId, workoutId))) {
    throw new Error("Sættet findes ikke for denne bruger.");
  }
  await db.delete(workoutSet).where(eq(workoutSet.id, entryId));
}

export async function updateCardioEntry(
  userId: string,
  entryId: string,
  data: { distance_km: number; duration_sec: number },
): Promise<void> {
  const workoutId = await getCardioEntryWorkoutId(entryId);
  if (!workoutId || !(await getWorkoutById(userId, workoutId))) {
    throw new Error("Cardio-registreringen findes ikke for denne bruger.");
  }
  await db.update(workoutCardio)
    .set({ distance_km: data.distance_km, duration_sec: data.duration_sec })
    .where(eq(workoutCardio.id, entryId));
}

export async function deleteCardioEntry(userId: string, entryId: string): Promise<void> {
  const workoutId = await getCardioEntryWorkoutId(entryId);
  if (!workoutId || !(await getWorkoutById(userId, workoutId))) {
    throw new Error("Cardio-registreringen findes ikke for denne bruger.");
  }
  await db.delete(workoutCardio).where(eq(workoutCardio.id, entryId));
}
