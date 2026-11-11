"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  approvePendingExercise,
  deletePendingExercise,
  mergePendingExercise,
  type ApprovalResult,
} from "@/lib/exercise-approval";

function finish(result: ApprovalResult): never {
  revalidatePath("/admin/exercises");
  revalidatePath("/log");
  // Kun en fast kode i adressen, aldrig navne eller id'er.
  redirect(`/admin/exercises?${result.ok ? "ok=1" : `fejl=${result.error}`}`);
}

export async function approveExerciseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  finish(await approvePendingExercise(formData.get("ownerId"), formData.get("type"), formData.get("base")));
}

export async function mergeExerciseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  finish(await mergePendingExercise(
    formData.get("ownerId"), formData.get("type"), formData.get("base"), formData.get("targetBase"),
  ));
}

export async function deleteExerciseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  finish(await deletePendingExercise(formData.get("ownerId"), formData.get("type"), formData.get("base")));
}
