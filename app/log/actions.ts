"use server";

import { requireUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { getTodayInCopenhagen } from "@/lib/dates";
import {
  addCardioEntry,
  addStrengthEntry,
  getExercises,
  getOrCreateWorkoutForDate,
} from "@/lib/workout-store";

export type LogStrengthSetState = {
  error?: string;
};

export async function logStrengthSet(
  _prevState: LogStrengthSetState,
  formData: FormData,
): Promise<LogStrengthSetState> {
  const currentUser = await requireUser();
  const exerciseId = formData.get("exerciseId");
  const reps = Number(formData.get("reps"));
  const weightKg = Number(formData.get("weightKg"));

  const exercises = await getExercises(currentUser.id);
  const exercise = exercises.find((exercise) => exercise.id === exerciseId);
  if (!exercise || exercise.type !== "strength") {
    return { error: "Vælg en gyldig styrkeøvelse." };
  }
  if (!Number.isInteger(reps) || reps <= 0) {
    return { error: "Gentagelser skal være et positivt heltal." };
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { error: "Vægt skal være et positivt tal." };
  }

  const today = getTodayInCopenhagen();
  const workout = await getOrCreateWorkoutForDate(currentUser.id, today);

  await addStrengthEntry(currentUser.id, {
    workout_id: workout.id,
    exercise_id: exercise.id,
    reps,
    weight_kg: weightKg,
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/log");

  return {};
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
