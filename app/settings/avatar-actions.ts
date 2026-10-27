"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { removeProfileImage, saveProfileImage } from "@/lib/avatars";
import { MAX_AVATAR_BYTES } from "@/lib/avatar-image";

export type AvatarState = { error?: string; success?: boolean };
export async function changeAvatarAction(_state: AvatarState, data: FormData): Promise<AvatarState> {
  const user = await requireUser();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: "Billedlageret er ikke klar endnu." };
  try {
    let result: AvatarState;
    if (data.get("operation") === "remove") result = await removeProfileImage(user.id);
    else {
      const file = data.get("image");
      if (!(file instanceof File) || !file.size || file.size > MAX_AVATAR_BYTES) return { error: "Vælg et billede, og prøv igen." };
      result = await saveProfileImage(user.id, new Uint8Array(await file.arrayBuffer()));
    }
    if (result.success) {
      revalidatePath("/settings"); revalidatePath("/community"); revalidatePath("/community/[id]", "page");
    }
    return result;
  } catch { return { error: "Billedet kunne ikke gemmes. Prøv et JPG-, PNG- eller WebP-billede igen." }; }
}
