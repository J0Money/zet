"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { setReaction, shareWorkout, withdrawPost } from "@/lib/community";

export type CommunityActionState = { error?: string; success?: boolean };
function refresh() {
  revalidatePath("/community");
  revalidatePath("/history/[id]", "page");
}

export async function shareWorkoutAction(_state: CommunityActionState, data: FormData): Promise<CommunityActionState> {
  const user = await requireUser();
  const result = await shareWorkout(user.id, String(data.get("workoutId") ?? ""), String(data.get("preview") ?? ""));
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
