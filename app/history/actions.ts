"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { saveWorkoutEdit } from "@/lib/workout-edit";
import { WorkoutEditError, type WorkoutEdit } from "@/lib/workout-edit-input";
import { rejectHealthText } from "@/lib/health-notice";
import { db } from "@/lib/db";
import { workout } from "@/lib/db/schema";
export type EditState = { error?: string; success?: boolean };
function refresh(id: string) {
  for (const path of ["/history", `/history/${id}`, "/log", "/dashboard", "/community"]) revalidatePath(path);
}
export async function saveWorkoutAction(_: EditState, data: FormData): Promise<EditState> {
  const user = await requireUser();
  const id = String(data.get("id") ?? "");
  try {
    const raw = String(data.get("payload") ?? "");
    if (raw.length > 200000) return { error: "Træningen er for stor." };
    const edit = JSON.parse(raw) as WorkoutEdit;
    const healthError = rejectHealthText(edit?.notes);
    if (healthError) return { error: healthError };
    await saveWorkoutEdit(user.id, id, String(data.get("version") ?? ""), edit);
  } catch (error) {
    return { error: error instanceof WorkoutEditError ? error.message : "Træningen kunne ikke gemmes. Prøv igen." };
  }
  refresh(id);
  return { success: true };
}
export async function deleteWorkoutAction(_: EditState, data: FormData): Promise<EditState> {
  const user = await requireUser();
  const id = String(data.get("id") ?? "");
  try {
    const rows = await db.delete(workout).where(and(eq(workout.id, id), eq(workout.user_id, user.id))).returning({ id: workout.id });
    if (rows.length !== 1) return { error: "Træningen findes ikke." };
  } catch { return { error: "Træningen kunne ikke slettes." }; }
  refresh(id);
  redirect("/history");
}
