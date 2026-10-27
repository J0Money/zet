import "server-only";
import { randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { ownedAvatarUrl, prepareAvatar } from "@/lib/avatar-image";

export async function getProfileImage(userId: string) {
  const [profile] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId));
  return profile?.image ?? null;
}

async function removeBlob(image: string | null, userId: string) {
  if (ownedAvatarUrl(image, userId)) {
    try { await del(image!); }
    catch { console.warn("Et tidligere profilbillede kunne ikke ryddes op i billedlageret."); }
  }
}

export async function saveProfileImage(userId: string, bytes: Uint8Array) {
  const image = await prepareAvatar(bytes);
  const previous = await getProfileImage(userId);
  const blob = await put(`avatars/${userId}/${randomUUID()}.webp`, image, {
    access: "private", contentType: "image/webp", cacheControlMaxAge: 60,
  });
  // Samtidige ændringer må ikke overskrive hinanden eller slette det aktive billede.
  const updated = await db.update(user).set({ image: blob.url }).where(and(eq(user.id, userId),
    previous === null ? isNull(user.image) : eq(user.image, previous))).returning({ id: user.id });
  if (!updated.length) {
    await removeBlob(blob.url, userId);
    return { error: "Profilen er ændret imens. Genindlæs siden og prøv igen." };
  }
  await removeBlob(previous, userId);
  return { success: true };
}

export async function removeProfileImage(userId: string) {
  const previous = await getProfileImage(userId);
  if (!previous) return { success: true };
  const updated = await db.update(user).set({ image: null }).where(and(eq(user.id, userId), eq(user.image, previous))).returning({ id: user.id });
  if (!updated.length) return { error: "Profilen er ændret imens. Genindlæs siden og prøv igen." };
  await removeBlob(previous, userId);
  return { success: true };
}
