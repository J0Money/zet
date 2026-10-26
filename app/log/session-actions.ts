"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTodayInCopenhagen } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { endActiveWorkout, getActiveWorkout, getOrStartActiveWorkout } from "@/lib/workout-store";

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
  const active = await getActiveWorkout(currentUser.id);
  const ended = active ? await endActiveWorkout(currentUser.id, active.id) : false;
  refreshPages();
  if (active && ended) redirect(`/history/${active.id}`);
}
