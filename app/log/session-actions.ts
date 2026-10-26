"use server";

import { revalidatePath } from "next/cache";
import { getTodayInCopenhagen } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { endActiveWorkout, getOrStartActiveWorkout } from "@/lib/workout-store";

function refreshPages() {
  revalidatePath("/log");
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

export async function startWorkoutAction() {
  const currentUser = await requireUser();
  await getOrStartActiveWorkout(currentUser.id, getTodayInCopenhagen());
  refreshPages();
}

export async function endWorkoutAction() {
  const currentUser = await requireUser();
  await endActiveWorkout(currentUser.id);
  refreshPages();
}
