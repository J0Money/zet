import assert from "node:assert/strict";
import { test } from "node:test";
import { getExerciseHistory } from "../lib/workouts";
import { formatSetsSummary } from "../lib/format";
import type { StrengthEntry, Workout } from "../lib/types";

const workout = (id: string, started_at: string | null, ended_at: string | null): Workout => ({
  id, user_id: "test", date: "2026-10-20", notes: "", started_at, ended_at,
});
const entry = (id: string, workout_id: string, exercise_id: string, weight_kg: number, reps: number): StrengthEntry => ({
  id, kind: "strength", workout_id, exercise_id, weight_kg, reps,
});

test("Seneste afsluttede pas vælges, mens aktivt pas kun påvirker PR", () => {
  const workouts = [
    workout("old", null, null),
    workout("early", "2026-10-20T08:00:00Z", "2026-10-20T09:00:00Z"),
    workout("late", "2026-10-20T12:00:00Z", "2026-10-20T13:00:00Z"),
    workout("active", "2026-10-20T16:00:00Z", null),
  ];
  const entries = [entry("1", "old", "bar", 30, 10), entry("2", "late", "bar", 40, 8),
    entry("3", "early", "bar", 35, 8), entry("4", "late", "bar", 37.5, 10),
    entry("5", "active", "bar", 50, 5), entry("6", "active", "bar", 50, 6),
    entry("7", "old", "machine", 70, 8), entry("8", "missing", "bar", 999, 99)];
  const history = getExerciseHistory(workouts, entries, "active");
  assert.deepEqual(history.bar.lastSets, [{ weight_kg: 40, reps: 8 }, { weight_kg: 37.5, reps: 10 }]);
  assert.deepEqual(history.bar.best, { weight_kg: 50, reps: 6 });
  assert.deepEqual(history.machine.best, { weight_kg: 70, reps: 8 });
  assert.equal(history.machine.lastDate, "2026-10-20");
});

test("Første sæt i aktivt pas har PR, men intet tidligere pas", () => {
  const result = getExerciseHistory([workout("active", "2026-10-20T16:00:00Z", null)], [entry("1", "active", "body", 0, 10)]);
  assert.deepEqual(result.body, { lastDate: null, lastSets: [], best: { weight_kg: 0, reps: 10 } });
  assert.deepEqual(getExerciseHistory([], []), {});
});

test("Danske decimaltal og kun sammenhængende ens sæt samles", () => {
  assert.equal(formatSetsSummary([
    { weight_kg: 37.5, reps: 8 }, { weight_kg: 37.5, reps: 8 },
    { weight_kg: 0, reps: 10 }, { weight_kg: 37.5, reps: 8 },
  ]), "37,5 kg × 8 (2 sæt), 0 kg × 10, 37,5 kg × 8");
});
