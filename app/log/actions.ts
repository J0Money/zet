"use server";

import { requireUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { getTodayInCopenhagen } from "@/lib/dates";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import type { Exercise, ExerciseType, MuscleGroup, StrengthEntry } from "@/lib/types";
import {
  addCardioEntry,
  addStrengthEntries,
  createExercise,
  getEntries,
  getExercises,
  getOrCreateWorkoutForDate,
} from "@/lib/workout-store";

export type LogStrengthSetState = {
  error?: string;
  success?: boolean;
  newRecord?: boolean;
};

export async function logStrengthSet(
  _prevState: LogStrengthSetState,
  formData: FormData,
): Promise<LogStrengthSetState> {
  const currentUser = await requireUser();
  const exerciseId = formData.get("exerciseId");
  // Et sæt pr. par af reps/vægt, i den rækkefølge de blev tilføjet i formularen.
  const repsRaw = formData.getAll("reps");
  const weightKgRaw = formData.getAll("weightKg");

  const exercises = await getExercises(currentUser.id);
  const exercise = exercises.find((exercise) => exercise.id === exerciseId);
  if (!exercise || exercise.type !== "strength") {
    return { error: "Vælg en gyldig styrkeøvelse." };
  }
  if (repsRaw.length === 0 || repsRaw.length !== weightKgRaw.length) {
    return { error: "Tilføj mindst ét sæt." };
  }

  const sets: { reps: number; weight_kg: number }[] = [];
  for (let i = 0; i < repsRaw.length; i++) {
    const reps = Number(repsRaw[i]);
    const weightKg = Number(weightKgRaw[i]);
    if (!Number.isInteger(reps) || reps <= 0) {
      return { error: `Gentagelser skal være et positivt heltal (sæt ${i + 1}).` };
    }
    // 0 er gyldigt, fx kropsvægtsøvelser som dips uden ekstra vægt.
    if (!Number.isFinite(weightKg) || weightKg < 0) {
      return { error: `Vægt skal være 0 eller derover (sæt ${i + 1}).` };
    }
    sets.push({ reps, weight_kg: weightKg });
  }

  // Tjek for en ny rekord, før sættene gemmes, samme sammenligning som
  // getPersonalRecords() i lib/workouts.ts (tungest vinder, lige vægt
  // afgøres af flest reps). Ingen tidligere sæt for øvelsen tæller også
  // som en rekord, det er trods alt din første.
  const existingEntries = await getEntries(currentUser.id);
  const priorBest = existingEntries
    .filter((entry): entry is StrengthEntry => entry.kind === "strength" && entry.exercise_id === exercise.id)
    .reduce<{ weight_kg: number; reps: number } | null>((best, entry) => {
      if (!best || entry.weight_kg > best.weight_kg || (entry.weight_kg === best.weight_kg && entry.reps > best.reps)) {
        return { weight_kg: entry.weight_kg, reps: entry.reps };
      }
      return best;
    }, null);
  const newRecord = sets.some((set) =>
    !priorBest || set.weight_kg > priorBest.weight_kg ||
    (set.weight_kg === priorBest.weight_kg && set.reps > priorBest.reps),
  );

  const today = getTodayInCopenhagen();
  const workout = await getOrCreateWorkoutForDate(currentUser.id, today);

  await addStrengthEntries(currentUser.id, {
    workout_id: workout.id,
    exercise_id: exercise.id,
    sets,
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/log");

  return { success: true, newRecord };
}

export type LogCardioEntryState = {
  error?: string;
  values?: {
    exerciseId: string;
    distanceKm: string;
    minutes: string;
    seconds: string;
  };
};

export async function logCardioEntry(
  _prevState: LogCardioEntryState,
  formData: FormData,
): Promise<LogCardioEntryState> {
  const currentUser = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const distanceKmRaw = String(formData.get("distanceKm") ?? "");
  const minutesRaw = String(formData.get("minutes") ?? "");
  const secondsRaw = String(formData.get("seconds") ?? "");
  const values = { exerciseId, distanceKm: distanceKmRaw, minutes: minutesRaw, seconds: secondsRaw };

  const exercises = await getExercises(currentUser.id);
  const exercise = exercises.find((exercise) => exercise.id === exerciseId);
  if (!exercise || exercise.type !== "cardio") {
    return { error: "Vælg en gyldig cardio-øvelse.", values };
  }

  const distanceKm = Number(distanceKmRaw);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return { error: "Distance skal være et positivt tal.", values };
  }

  const minutes = Number(minutesRaw);
  if (!Number.isInteger(minutes) || minutes < 0) {
    return { error: "Minutter skal være et heltal på 0 eller derover.", values };
  }

  const seconds = Number(secondsRaw);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
    return { error: "Sekunder skal være et heltal mellem 0 og 59.", values };
  }

  const durationSec = minutes * 60 + seconds;
  if (durationSec <= 0) {
    return { error: "Varighed skal være mere end 0 sekunder.", values };
  }

  const today = getTodayInCopenhagen();
  const workout = await getOrCreateWorkoutForDate(currentUser.id, today);

  await addCardioEntry(currentUser.id, {
    workout_id: workout.id,
    exercise_id: exercise.id,
    distance_km: distanceKm,
    duration_sec: durationSec,
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/log");

  return {};
}

export type CreateExerciseState = {
  error?: string;
  exercise?: Exercise;
};

export async function createExerciseAction(
  _prevState: CreateExerciseState,
  formData: FormData,
): Promise<CreateExerciseState> {
  const currentUser = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const muscleGroupsRaw = formData.getAll("muscleGroups").map(String);

  if (!name) {
    return { error: "Skriv et navn på øvelsen." };
  }
  if (name.length > 100) {
    return { error: "Navnet må højst være 100 tegn." };
  }
  if (type !== "strength" && type !== "cardio") {
    return { error: "Ugyldig øvelsestype." };
  }
  const exerciseType = type as ExerciseType;

  const muscleGroups = muscleGroupsRaw.filter((group): group is MuscleGroup =>
    (MUSCLE_GROUPS as string[]).includes(group),
  );
  // Cardio har ingen muskelgruppe-filter i UI'en, så kun styrkeøvelser
  // kræver mindst én, ellers ville de aldrig kunne vælges via filteret.
  if (exerciseType === "strength" && muscleGroups.length === 0) {
    return { error: "Vælg mindst én muskelgruppe." };
  }

  const visibleExercises = await getExercises(currentUser.id);
  const normalizedName = name.toLowerCase();
  const isDuplicate = visibleExercises.some(
    (existing) => existing.type === exerciseType && existing.name.trim().toLowerCase() === normalizedName,
  );
  if (isDuplicate) {
    return { error: `"${name}" findes allerede, vælg den i listen i stedet for at oprette den igen.` };
  }

  const created = await createExercise(currentUser.id, { name, type: exerciseType, muscleGroups });

  revalidatePath("/log");

  return { exercise: created };
}
