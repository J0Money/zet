import assert from "node:assert/strict";
import { test } from "node:test";
import { publishWorkoutExpiry } from "../lib/workout-expiry-publisher";
const config = { token: "test-token", secret: "test-secret", callbackUrl: "https://example.invalid/api/workouts/expire" };
test("Deadline, minimal payload og deduplikering ved genforsøg", async () => {
  const calls: RequestInit[] = [];
  const send: typeof fetch = async (_, init) => { calls.push(init!); return new Response("", { status: calls.length === 1 ? 503 : 200 }); };
  await publishWorkoutExpiry("workout", 1800003600, config, send);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].headers, calls[1].headers);
  assert.equal(new Headers(calls[0].headers).get("Upstash-Not-Before"), "1800003600");
  assert.equal(calls[0].body, JSON.stringify({ workoutId: "workout" }));
});
test("Ny deadline giver ny opgave, fejl lækker ikke svar", async () => {
  const keys: string[] = [];
  const send: typeof fetch = async (_, init) => { keys.push(new Headers(init?.headers).get("Upstash-Deduplication-Id")!); return new Response("", { status: 200 }); };
  await publishWorkoutExpiry("workout", 1800003600, config, send);
  await publishWorkoutExpiry("workout", 1800003900, config, send);
  assert.notEqual(keys[0], keys[1]);
  await assert.rejects(publishWorkoutExpiry("workout", 1800003600, config, async () => { throw new Error("sensitive response"); }), { message: "Afslutningen kunne ikke planlægges." });
  await assert.rejects(publishWorkoutExpiry("workout", 1800003600, { ...config, token: "" }, send));
});
