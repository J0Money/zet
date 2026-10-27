"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { addComment, addWorkoutDetails, getDetailsPreview, deleteCaption, deleteComment, setReaction, shareWorkout, withdrawPost } from "@/lib/community";
import { notifyComment } from "@/lib/push";

export type CommunityActionState = { error?: string; success?: boolean };
function refresh() {
  revalidatePath("/community");
  revalidatePath("/history/[id]", "page");
  revalidatePath("/community/[id]", "page");
}

export async function shareWorkoutAction(_state: CommunityActionState, data: FormData): Promise<CommunityActionState> {
  const user = await requireUser();
  const result = await shareWorkout(user.id, String(data.get("workoutId") ?? ""), String(data.get("preview") ?? ""), String(data.get("caption") ?? ""));
  if (result.success) refresh();
  return result;
}
export async function withdrawPostAction(_state: CommunityActionState, data: FormData): Promise<CommunityActionState> {
  const user = await requireUser();
  await withdrawPost(user.id, String(data.get("postId") ?? ""));
  refresh();
  return { success: true };
}
export async function reactAction(_state: CommunityActionState, data: FormData): Promise<CommunityActionState> {
  const user = await requireUser();
  await setReaction(user.id, String(data.get("postId") ?? ""), data.get("active") === "true");
  revalidatePath("/community");
  return { success: true };
}

export async function commentAction(_state: CommunityActionState, data: FormData): Promise<CommunityActionState> {
  const user = await requireUser();
  const result = await addComment(user.id, String(data.get("postId") ?? ""), String(data.get("commentId") ?? ""), String(data.get("body") ?? ""));
  if (result.success) {
    refresh();
    if (result.insertedId) {
      try { await notifyComment(result.insertedId); }
      catch { console.warn("Kommentaren er gemt, men push kunne ikke sendes."); }
    }
  }
  return result;
}

export async function deleteCommentAction(data: FormData) {
  const user = await requireUser();
  await deleteComment(user.id, String(data.get("commentId") ?? ""));
  refresh();
}

export async function deleteCaptionAction(data: FormData) {
  const user = await requireUser();
  await deleteCaption(user.id, String(data.get("postId") ?? ""));
  refresh();
}

export async function previewDetailsAction(postId: string) {
  const user = await requireUser();
  return getDetailsPreview(user.id, postId);
}

export async function addDetailsAction(_state: CommunityActionState, data: FormData): Promise<CommunityActionState> {
  const user = await requireUser();
  const result = await addWorkoutDetails(user.id, String(data.get("postId") ?? ""), String(data.get("preview") ?? ""));
  if (result.success) refresh();
  return result;
}
