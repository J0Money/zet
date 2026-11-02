import sharp from "sharp";

export const MAX_AVATAR_BYTES = 800_000;

export async function prepareAvatar(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES) throw new Error("Billedet er for stort.");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("Vælg et JPG-, PNG- eller WebP-billede.");
  // rotate følger EXIF-orientering. Ny kodning fjerner metadata, herunder GPS.
  return image.rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
}

// user.image gemmer objektnøglen i billedlageret, fx "avatars/<bruger-id>/<uuid>.webp".
export function ownedAvatarKey(value: string | null, userId: string) {
  return Boolean(value && value.startsWith(`avatars/${userId}/`) && /^avatars\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/i.test(value));
}
