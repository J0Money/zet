import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { parseSetCookieHeader } from "better-auth/cookies";

// Kræver den lokale udviklingsserver og udtrykkeligt tilvalg af Neon-testdata.
test("Sessionsbeskyttelse og dataadskillelse mellem to brugere", {
  skip: process.env.ZET_RUN_ACCESS_TESTS !== "1",
}, async (t) => {
  config({ path: ".env.local", quiet: true });
  const base = "http://localhost:3000";
  const { db } = await import("../lib/db");
  const schema = await import("../lib/db/schema");
  const store = await import("../lib/workout-store");
  const { auth } = await import("../lib/auth");
  const { getTodayInCopenhagen } = await import("../lib/dates");
  const require = createRequire(import.meta.url);
  const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node") as {
    encodeReply(args: unknown[]): Promise<FormData | string>;
  };
  const userIds = [randomUUID(), randomUUID()];
  const exerciseIds: string[] = [];
  const password = randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(password);
  const fixtures: { id: string; cookie: string; strength: string; cardio: string; workoutId: string }[] = [];
  const actionIds = new Map<string, string>();

  async function postAction(name: string, cookie: string, values: Record<string, string>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    const body = await encodeReply([{}, form]);
    const response = await fetch(`${base}/log`, {
      method: "POST", redirect: "manual", body,
      headers: { origin: base, cookie, "next-action": actionIds.get(name)! },
    });
    const text = await response.text();
    return { response, text };
  }

  try {
    for (const id of userIds) {
      const email = `zet-access-${id}@example.invalid`;
      await db.insert(schema.user).values({ id, email, name: "Adgangstest" });
      await db.insert(schema.account).values({
        id: randomUUID(), userId: id, accountId: id, providerId: "credential",
        password: passwordHash, updatedAt: new Date(),
      });
      const login = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
      assert.equal(login.status, 200);
      const cookie = [...parseSetCookieHeader(login.headers.get("set-cookie")!)]
        .map(([key, value]) => `${key}=${value.value}`).join("; ");
      const strength = randomUUID();
      const cardio = randomUUID();
      exerciseIds.push(strength, cardio);
      await db.insert(schema.exercise).values([
        { id: strength, user_id: id, name: `Privat styrke ${id}`, type: "strength" },
        { id: cardio, user_id: id, name: `Privat cardio ${id}`, type: "cardio" },
      ]);
      const workout = await store.getOrCreateWorkoutForDate(id, "2020-01-02");
      await store.addStrengthEntry(id, { workout_id: workout.id, exercise_id: strength, reps: 5, weight_kg: 20 });
      await store.addCardioEntry(id, { workout_id: workout.id, exercise_id: cardio, distance_km: 2, duration_sec: 600 });
      fixtures.push({ id, cookie, strength, cardio, workoutId: workout.id });
    }
    const [a, b] = fixtures;
    await t.test("Databasefunktioner isolerer begge brugeres træninger og private øvelser", async () => {
      for (const [own, other] of [[a, b], [b, a]]) {
        const workouts = await store.getWorkouts(own.id);
        assert.equal(workouts.length, 1);
        assert.equal(workouts[0].id, own.workoutId);
        const entries = await store.getEntries(own.id);
        assert.equal(entries.length, 2);
        assert.ok(entries.every((entry) => entry.workout_id === own.workoutId));
        const exercises = await store.getExercises(own.id);
        assert.ok(exercises.some((exercise) => exercise.id === own.strength));
        assert.ok(!exercises.some((exercise) => exercise.id === other.strength || exercise.id === other.cardio));
        assert.equal(await store.getWorkoutById(own.id, other.workoutId), undefined);
        assert.equal(await store.getWorkoutById(own.id, "ugyldigt-id"), undefined);
        await assert.rejects(store.addStrengthEntry(own.id, {
          workout_id: other.workoutId, exercise_id: own.strength, reps: 5, weight_kg: 20,
        }));
        await assert.rejects(store.addCardioEntry(own.id, {
          workout_id: other.workoutId, exercise_id: own.cardio, distance_km: 1, duration_sec: 60,
        }));
        await assert.rejects(store.addStrengthEntry(own.id, {
          workout_id: own.workoutId, exercise_id: other.strength, reps: 5, weight_kg: 20,
        }));
        await assert.rejects(store.addCardioEntry(own.id, {
          workout_id: own.workoutId, exercise_id: other.cardio, distance_km: 1, duration_sec: 60,
        }));
      }
    });
    await t.test("Alle træningssider afviser besøgende uden session", async () => {
      for (const path of ["/dashboard", "/log", "/history", `/history/${a.workoutId}`]) {
        const response = await fetch(`${base}${path}`, { redirect: "manual" });
        const body = await response.text();
        assert.ok(response.headers.get("location") === "/login" ||
          (body.includes("NEXT_REDIRECT") && body.includes("/login")), path);
        assert.ok(!body.includes(`Privat styrke ${a.id}`));
      }
    });
    await t.test("Sider viser kun egen data; fremmed og ukendt træning giver 404", async () => {
      for (const [own, other] of [[a, b], [b, a]]) {
        for (const path of ["/dashboard", "/log", "/history", `/history/${own.workoutId}`]) {
          const response = await fetch(`${base}${path}`, { headers: { cookie: own.cookie } });
          const body = await response.text();
          assert.equal(response.status, 200);
          assert.ok(!body.includes(`Privat styrke ${other.id}`));
          assert.ok(!body.includes(other.workoutId));
          if (path === "/history") assert.ok(body.includes(own.workoutId));
        }
        for (const id of [other.workoutId, randomUUID(), "ugyldigt-id"]) {
          const response = await fetch(`${base}/history/${id}`, { headers: { cookie: own.cookie } });
          const body = await response.text();
          assert.ok(response.status === 404 || body.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
          assert.ok(!body.includes(`Privat styrke ${other.id}`));
        }
      }
    });
    // Læs kun id'erne til de to handlinger; manifestets øvrige data udskrives ikke.
    const manifest = JSON.parse(await readFile(".next/dev/server/server-reference-manifest.json", "utf8"));
    for (const [id, action] of Object.entries(manifest.node) as [string, { filename: string; exportedName: string }][]) {
      if (action.filename === "app/log/actions.ts") actionIds.set(action.exportedName, id);
    }
    assert.ok(actionIds.has("logStrengthSet") && actionIds.has("logCardioEntry"));
    const strengthValues = { exerciseId: a.strength, reps: "5", weightKg: "20", userId: b.id, workoutId: b.workoutId };
    const cardioValues = { exerciseId: a.cardio, distanceKm: "2", minutes: "10", seconds: "0", userId: b.id, workoutId: b.workoutId };
    await t.test("Direkte Server Action-kald uden session afvises uden skrivning", async () => {
      for (const [name, values] of [["logStrengthSet", strengthValues], ["logCardioEntry", cardioValues]] as const) {
        const { response, text } = await postAction(name, "", values);
        assert.ok(response.headers.get("x-action-redirect")?.startsWith("/login") ||
          (text.includes("NEXT_REDIRECT") && text.includes("/login")));
      }
      assert.equal((await store.getWorkouts(a.id)).length, 1);
      assert.equal((await store.getWorkouts(b.id)).length, 1);
    });
    await t.test("Forfalsket bruger-id ignoreres; private fremmede øvelser afvises", async () => {
      for (const [name, values, foreignExercise] of [
        ["logStrengthSet", strengthValues, b.strength],
        ["logCardioEntry", cardioValues, b.cardio],
      ] as const) {
        const rejected = await postAction(name, a.cookie, { ...values, exerciseId: foreignExercise });
        assert.ok(rejected.text.includes("gyldig"));
        const accepted = await postAction(name, a.cookie, values);
        assert.equal(accepted.response.status, 200);
      }
      const workouts = await store.getWorkouts(a.id);
      assert.equal(workouts.length, 2);
      const today = workouts.find((workout) => workout.date === getTodayInCopenhagen());
      assert.ok(today);
      assert.equal((await store.getEntries(a.id)).filter((entry) => entry.workout_id === today.id).length, 2);
      assert.equal((await store.getWorkouts(b.id)).length, 1);
      assert.equal((await store.getEntries(b.id)).length, 2);
    });
    await t.test("Slettet session afvises på både sider og handlinger", async () => {
      await db.delete(schema.session).where(eq(schema.session.userId, a.id));
      const page = await fetch(`${base}/history`, { headers: { cookie: a.cookie }, redirect: "manual" });
      const body = await page.text();
      assert.ok(page.headers.get("location") === "/login" || body.includes("NEXT_REDIRECT"));
      const action = await postAction("logStrengthSet", a.cookie, strengthValues);
      assert.ok(action.response.headers.get("x-action-redirect")?.startsWith("/login") || action.text.includes("NEXT_REDIRECT"));
      assert.equal((await store.getEntries(a.id)).length, 4);
    });
  } finally {
    // Træninger fjernes først, så deres sæt ikke blokerer sletning af private øvelser.
    await db.delete(schema.workout).where(inArray(schema.workout.user_id, userIds));
    if (exerciseIds.length) await db.delete(schema.exercise).where(inArray(schema.exercise.id, exerciseIds));
    await db.delete(schema.user).where(inArray(schema.user.id, userIds));
  }
});
