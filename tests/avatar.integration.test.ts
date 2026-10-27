import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";
import sharp from "sharp";
import { get, list } from "@vercel/blob";

test("Profilbilleder kan uploades, udskiftes og fjernes uden at påvirke andre", { skip: process.env.ZET_RUN_AVATAR_TESTS !== "1" }, async () => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user } = await import("../lib/db/schema");
  const { saveProfileImage, removeProfileImage, getProfileImage } = await import("../lib/avatars");
  const ids = [randomUUID(), randomUUID()];
  const bytes = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#4f46e5" } }).png().toBuffer();
  try {
    await db.insert(user).values(ids.map((id) => ({ id, name: "Profiltest", email: `avatar-${id}@example.invalid` })));
    for (const id of ids) assert.equal((await saveProfileImage(id, bytes)).success, true);
    const first = (await getProfileImage(ids[0]))!, other = (await getProfileImage(ids[1]))!;
    assert.equal((await get(first, { access: "private" }))?.statusCode, 200);
    const anonymous = await fetch(first);
    assert.notEqual(anonymous.status, 200);
    assert.equal((await saveProfileImage(ids[0], bytes)).success, true);
    assert.notEqual(await getProfileImage(ids[0]), first);
    assert.equal(await getProfileImage(ids[1]), other);
    assert.equal((await list({ prefix: `avatars/${ids[0]}/` })).blobs.length, 1);
    assert.equal((await removeProfileImage(ids[0])).success, true);
    assert.equal(await getProfileImage(ids[0]), null);
    assert.equal((await list({ prefix: `avatars/${ids[0]}/` })).blobs.length, 0);
    assert.equal(await getProfileImage(ids[1]), other);
  } catch { throw new Error("Profilbilledtesten fejlede; lager- og forbindelsesoplysninger skjult."); }
  finally {
    for (const id of ids) await removeProfileImage(id);
    await db.delete(user).where(inArray(user.id, ids));
  }
});
