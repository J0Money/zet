import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";
import sharp from "sharp";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

test("Profilbilleder kan uploades, udskiftes og fjernes uden at påvirke andre", { skip: process.env.ZET_RUN_AVATAR_TESTS !== "1" }, async () => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user } = await import("../lib/db/schema");
  const { saveProfileImage, removeProfileImage, getProfileImage } = await import("../lib/avatars");
  const { getAvatarObject } = await import("../lib/avatar-storage");
  const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
  const count = async (id: string) => (await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: `avatars/${id}/` }))).KeyCount ?? 0;
  const ids = [randomUUID(), randomUUID()];
  const bytes = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#4f46e5" } }).png().toBuffer();
  try {
    await db.insert(user).values(ids.map((id) => ({ id, name: "Profiltest", email: `avatar-${id}@example.invalid` })));
    for (const id of ids) assert.equal((await saveProfileImage(id, bytes)).success, true);
    const first = (await getProfileImage(ids[0]))!, other = (await getProfileImage(ids[1]))!;
    assert.notEqual(await getAvatarObject(first), null);
    // Bucketten er privat: uden nøgler kan objektet ikke hentes.
    const anonymous = await fetch(new URL(`/${process.env.S3_BUCKET}/${first}`, process.env.S3_ENDPOINT));
    assert.notEqual(anonymous.status, 200);
    assert.equal((await saveProfileImage(ids[0], bytes)).success, true);
    assert.notEqual(await getProfileImage(ids[0]), first);
    assert.equal(await getProfileImage(ids[1]), other);
    assert.equal(await count(ids[0]), 1);
    assert.equal((await removeProfileImage(ids[0])).success, true);
    assert.equal(await getProfileImage(ids[0]), null);
    assert.equal(await count(ids[0]), 0);
    assert.equal(await getProfileImage(ids[1]), other);
  } catch { throw new Error("Profilbilledtesten fejlede; lager- og forbindelsesoplysninger skjult."); }
  finally {
    for (const id of ids) await removeProfileImage(id);
    await db.delete(user).where(inArray(user.id, ids));
  }
});
