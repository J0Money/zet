import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";

test("Private noter er adskilt pr. bruger og øvelsesvariant", {
  skip: process.env.ZET_RUN_NOTE_TESTS !== "1",
}, async () => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, exercise } = await import("../lib/db/schema");
  const { getExerciseNotes, setExerciseNote } = await import("../lib/exercise-notes");
  const users = [randomUUID(), randomUUID()];
  const variants = [randomUUID(), randomUUID()];
  try {
    await db.insert(user).values(users.map((id) => ({ id, email: `zet-notes-${id}@example.invalid`, name: "Notetest" })));
    await db.insert(exercise).values(variants.map((id, index) => ({
      id, user_id: users[0], name: `Notetest ${index}`, type: "strength" as const,
      group_name: `Notetest ${users[0]}`, equipment: index === 0 ? "machine" as const : "dumbbells" as const,
      is_shared: true,
    })));
    await setExerciseNote(users[0], variants[0], "Sæde 4");
    await setExerciseNote(users[0], variants[1], "Bænk 30°");
    assert.deepEqual(await getExerciseNotes(users[1]), {});
    await setExerciseNote(users[1], variants[0], "Sæde 2");
    await setExerciseNote(users[0], variants[0], "Sæde 5");
    assert.deepEqual(await getExerciseNotes(users[0]), { [variants[0]]: "Sæde 5", [variants[1]]: "Bænk 30°" });
    assert.deepEqual(await getExerciseNotes(users[1]), { [variants[0]]: "Sæde 2" });
    await setExerciseNote(users[0], variants[0], "");
    assert.deepEqual(await getExerciseNotes(users[0]), { [variants[1]]: "Bænk 30°" });
    assert.deepEqual(await getExerciseNotes(users[1]), { [variants[0]]: "Sæde 2" });
  } catch {
    throw new Error("Notetesten fejlede; databasedetaljer er skjult.");
  } finally {
    await db.delete(user).where(inArray(user.id, users));
  }
});
