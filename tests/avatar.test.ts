import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { prepareAvatar, ownedAvatarKey, MAX_AVATAR_BYTES } from "../lib/avatar-image";

test("Profilbilleder bliver kvadratiske WebP uden EXIF", async () => {
  const original = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#4f46e5" } }).jpeg().withMetadata().toBuffer();
  const output = await prepareAvatar(original);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 512); assert.equal(metadata.height, 512);
  assert.equal(metadata.format, "webp"); assert.equal(metadata.exif, undefined);
});
test("Ugyldige og for store billeder afvises", async () => {
  await assert.rejects(prepareAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')));
  await assert.rejects(prepareAvatar(Buffer.from("not an image")));
  await assert.rejects(prepareAvatar(new Uint8Array(MAX_AVATAR_BYTES + 1)));
});
test("Oprydning accepterer kun profilens egne objektnøgler", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  const key = `avatars/${id}/12345678-1234-1234-1234-123456789def.webp`;
  assert.equal(ownedAvatarKey(key, id), true);
  assert.equal(ownedAvatarKey(key, "another-user"), false);
  assert.equal(ownedAvatarKey(`https://evil.example/${key}`, id), false);
  assert.equal(ownedAvatarKey(`avatars/${id}/../x/12345678-1234-1234-1234-123456789def.webp`, id), false);
  assert.equal(ownedAvatarKey(`https://example.private.blob.vercel-storage.com/${key}`, id), false);
});
