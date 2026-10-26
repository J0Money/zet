import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseNote } from "@/lib/db/schema";

// Bruger-id kommer altid fra sessionen i siden eller handlingen.
export async function getExerciseNotes(userId: string): Promise<Record<string, string>> {
  const rows = await db.select({ exerciseId: exerciseNote.exercise_id, note: exerciseNote.note })
    .from(exerciseNote).where(eq(exerciseNote.user_id, userId));
  return Object.fromEntries(rows.map((row) => [row.exerciseId, row.note]));
}

export async function setExerciseNote(userId: string, exerciseId: string, note: string) {
  if (!note) {
    await db.delete(exerciseNote).where(and(eq(exerciseNote.user_id, userId), eq(exerciseNote.exercise_id, exerciseId)));
    return;
  }
  await db.insert(exerciseNote).values({ user_id: userId, exercise_id: exerciseId, note })
    .onConflictDoUpdate({
      target: [exerciseNote.user_id, exerciseNote.exercise_id],
      set: { note, updated_at: new Date() },
    });
}
