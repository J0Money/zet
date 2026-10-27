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

export function ownedAvatarUrl(value: string | null, userId: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^[a-z0-9]+\.private\.blob\.vercel-storage\.com$/i.test(url.hostname)
      && !url.port && !url.username && !url.password && !url.search && !url.hash
      && url.pathname.startsWith(`/avatars/${userId}/`) && /^\/avatars\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/i.test(url.pathname);
  } catch { return false; }
}
