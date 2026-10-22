"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createProgram, deleteProgram, setProgramPublished } from "@/lib/programs";

export type CreateProgramState = { error?: string; success?: boolean };

export async function createProgramAction(
  _previousState: CreateProgramState,
  formData: FormData,
): Promise<CreateProgramState> {
  const currentUser = await requireUser();
  const name = String(formData.get("name") ?? "");
  const exerciseIds = formData.getAll("exerciseIds").map(String);

  try {
    await createProgram(currentUser.id, { name, exerciseIds });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Programmet kunne ikke oprettes." };
  }

  revalidatePath("/programs");
  revalidatePath("/log");
  return { success: true };
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const id = String(formData.get("id") ?? "");
  const isPublished = formData.get("isPublished") === "true";
  await setProgramPublished(currentUser.id, id, isPublished);
  revalidatePath("/programs");
  revalidatePath("/log");
}

export async function deleteProgramAction(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const id = String(formData.get("id") ?? "");
  await deleteProgram(currentUser.id, id);
  revalidatePath("/programs");
  revalidatePath("/log");
}
