import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { validateWorkoutEdit, parseWorkoutTime, localWorkoutTime } from "../lib/workout-edit-input";
const workout = { id: randomUUID(), user_id: randomUUID(), date: "2026-10-28", notes: "", started_at: null, ended_at: null };
test("Danish time validates daylight-saving changes and unchanged ambiguous times", () => {
  assert.equal(parseWorkoutTime("2026-07-01T12:00", null), "2026-07-01T10:00:00.000Z");
  assert.equal(parseWorkoutTime("2026-10-28T12:00", null), "2026-10-28T11:00:00.000Z");
  assert.throws(() => parseWorkoutTime("2026-03-29T02:30", null));
  assert.throws(() => parseWorkoutTime("2026-10-25T02:30", null));
  const original = "2026-10-25T00:30:00.000Z";
  assert.equal(parseWorkoutTime(localWorkoutTime(original), original), original);
});
test("Reject invalid dates, reversed times, reopening, duplicate IDs and bad numbers", () => {
  const input = { date: workout.date, start: "", end: "", notes: "", entries: [] };
  assert.doesNotThrow(() => validateWorkoutEdit(input, workout));
  assert.throws(() => validateWorkoutEdit({ ...input, date: "2026-02-30" }, workout));
  assert.throws(() => validateWorkoutEdit({ ...input, start: "2026-10-28T12:00", end: "2026-10-28T11:00" }, workout));
  assert.throws(() => validateWorkoutEdit({ ...input, start: "2026-10-28T12:00" }, workout));
  const entry = { id: randomUUID(), workout_id: workout.id, exercise_id: randomUUID(), kind: "strength" as const, reps: 10, weight_kg: 5 };
  assert.throws(() => validateWorkoutEdit({ ...input, entries: [entry, entry] }, workout));
  assert.throws(() => validateWorkoutEdit({ ...input, entries: [{ ...entry, weight_kg: Infinity }] }, workout));
});
