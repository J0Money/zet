import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { ownedAvatarKey, prepareAvatar } from "@/lib/avatar-image";
import { deleteAvatarObject, putAvatarObject } from "@/lib/avatar-storage";

export async function getProfileImage(userId: string) {
  const [profile] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId));
  return profile?.image ?? null;
}

async function removeObject(image: string | null, userId: string) {
  if (ownedAvatarKey(image, userId)) {
    try { await deleteAvatarObject(image!); }
    catch { console.warn("Et tidligere profilbillede kunne ikke ryddes op i billedlageret."); }
  }
}

export async function saveProfileImage(userId: string, bytes: Uint8Array) {
  const image = await prepareAvatar(bytes);
  const previous = await getProfileImage(userId);
  const key = `avatars/${userId}/${randomUUID()}.webp`;
  await putAvatarObject(key, image);
  // Samtidige ændringer må ikke overskrive hinanden eller slette det aktive billede.
  const updated = await db.update(user).set({ image: key }).where(and(eq(user.id, userId),
    previous === null ? isNull(user.image) : eq(user.image, previous))).returning({ id: user.id });
  if (!updated.length) {
    await removeObject(key, userId);
    return { error: "Profilen er ændret imens. Genindlæs siden og prøv igen." };
  }
  await removeObject(previous, userId);
  return { success: true };
}

export async function removeProfileImage(userId: string) {
  const previous = await getProfileImage(userId);
  if (!previous) return { success: true };
  const updated = await db.update(user).set({ image: null }).where(and(eq(user.id, userId), eq(user.image, previous))).returning({ id: user.id });
  if (!updated.length) return { error: "Profilen er ændret imens. Genindlæs siden og prøv igen." };
  await removeObject(previous, userId);
  return { success: true };
}
