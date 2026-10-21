"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  deleteCardioEntry,
  deleteStrengthEntry,
  updateCardioEntry,
  updateStrengthEntry,
} from "@/lib/workout-store";

// Begge sider, der viser loggede sæt, skal opdateres: dagens liste på
// log-siden, historik-oversigten og den specifikke trænings detaljeside.
function revalidateWorkoutPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/log");
  revalidatePath("/history");
  revalidatePath("/history/[id]", "page");
}

export async function deleteStrengthSetAction(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const id = String(formData.get("id") ?? "");
  await deleteStrengthEntry(currentUser.id, id);
  revalidateWorkoutPaths();
}

export async function deleteCardioEntryAction(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const id = String(formData.get("id") ?? "");
  await deleteCardioEntry(currentUser.id, id);
  revalidateWorkoutPaths();
}

export type UpdateStrengthSetState = { error?: string; success?: boolean };

export async function updateStrengthSetAction(
  _previousState: UpdateStrengthSetState,
  formData: FormData,
): Promise<UpdateStrengthSetState> {
  const currentUser = await requireUser();
  const id = String(formData.get("id") ?? "");
  const reps = Number(formData.get("reps"));
  const weightKg = Number(formData.get("weightKg"));

  if (!Number.isInteger(reps) || reps <= 0) {
    return { error: "Gentagelser skal være et positivt heltal." };
  }
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    return { error: "Vægt skal være 0 eller derover." };
  }

  try {
    await updateStrengthEntry(currentUser.id, id, { reps, weight_kg: weightKg });
  } catch {
    return { error: "Sættet kunne ikke opdateres." };
  }

  revalidateWorkoutPaths();
  return { success: true };
}

export type UpdateCardioEntryState = { error?: string; success?: boolean };

export async function updateCardioEntryAction(
  _previousState: UpdateCardioEntryState,
  formData: FormData,
): Promise<UpdateCardioEntryState> {
  const currentUser = await requireUser();
  const id = String(formData.get("id") ?? "");
  const distanceKm = Number(formData.get("distanceKm"));
  const minutes = Number(formData.get("minutes"));
  const seconds = Number(formData.get("seconds"));

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return { error: "Distance skal være et positivt tal." };
  }
  if (!Number.isInteger(minutes) || minutes < 0) {
    return { error: "Minutter skal være et heltal på 0 eller derover." };
  }
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 59) {
    return { error: "Sekunder skal være et heltal mellem 0 og 59." };
  }
  const durationSec = minutes * 60 + seconds;
  if (durationSec <= 0) {
    return { error: "Varighed skal være mere end 0 sekunder." };
  }

  try {
    await updateCardioEntry(currentUser.id, id, { distance_km: distanceKm, duration_sec: durationSec });
  } catch {
    return { error: "Cardio-registreringen kunne ikke opdateres." };
  }

  revalidateWorkoutPaths();
  return { success: true };
}
