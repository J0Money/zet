import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCommunitySummary } from "../lib/community-summary";
import type { Workout, StrengthEntry, Exercise, Entry } from "../lib/types";

const past: Workout = { id: "past", user_id: "owner", date: "2026-10-25", started_at: null, ended_at: null, notes: "Privat note" };
const current: Workout = { ...past, id: "current", date: "2026-10-26", started_at: "2026-10-26T10:00:00Z", ended_at: "2026-10-26T11:00:00Z" };
const entry = (id: string, workout_id: string, exercise_id: string, weight_kg: number, reps: number): StrengthEntry =>
  ({ id, workout_id, exercise_id, weight_kg, reps, kind: "strength" });
const exercises: Exercise[] = [{ id: "machine", user_id: null, name: "Bænkpres (Maskine)", type: "strength", muscle_groups: [], group_name: "Bænkpres", equipment: "machine" }];

test("Kun bedste PR pr. variant deles, og første registrering er ikke en PR", () => {
  const summary = buildCommunitySummary(current, [past, current], [
    entry("1", past.id, "machine", 40, 8), entry("2", current.id, "machine", 40, 9),
    entry("3", current.id, "machine", 45, 6), entry("4", current.id, "new", 100, 10),
  ], exercises)!;
  assert.equal(summary.records.length, 1);
  assert.equal(summary.records[0].weightKg, 45);
  assert.equal(summary.records[0].previousWeightKg, 40);
  assert.equal(summary.strengthSets, 3);
  assert.equal(summary.duration, "1 t");
  assert.equal(JSON.stringify(summary).includes("Privat note"), false);
  assert.deepEqual(Object.keys(summary).sort(), ["cardioSessions", "date", "duration", "exercises", "records", "strengthSets"]);
});

test("Samme vægt med flere gentagelser er PR; senere pas ændrer ikke en tidligere rekord", () => {
  const later = { ...current, id: "later", started_at: "2026-10-26T14:00:00Z", ended_at: "2026-10-26T15:00:00Z" };
  const summary = buildCommunitySummary(current, [past, current, later], [
    entry("1", past.id, "machine", 40, 8), entry("2", current.id, "machine", 40, 9), entry("3", later.id, "machine", 100, 10),
  ], exercises)!;
  assert.equal(summary.records[0].reps, 9);
});

test("Aktive og tomme pas kan ikke deles", () => {
  assert.equal(buildCommunitySummary({ ...current, ended_at: null }, [current], [entry("1", current.id, "machine", 40, 8)], exercises), null);
  assert.equal(buildCommunitySummary(current, [current], [], exercises), null);
});

test("Træningsdetaljer bevarer sæt og cardio, men udelader id'er og private data", () => {
  const entries: Entry[] = [entry("1", current.id, "machine", 0, 12), entry("2", past.id, "machine", 99, 1),
    { id: "3", workout_id: current.id, exercise_id: "run", kind: "cardio", distance_km: 5, duration_sec: 1500 },
    entry("4", current.id, "machine", 12.5, 8)];
  const result = buildCommunitySummary(current, [past, current], entries, exercises)!;
  assert.deepEqual(result.exercises, [
    { name: "Bænkpres (Maskine)", sets: [{ kind: "strength", weightKg: 0, reps: 12 }, { kind: "strength", weightKg: 12.5, reps: 8 }] },
    { name: "Øvelse", sets: [{ kind: "cardio", distanceKm: 5, durationSec: 1500 }] },
  ]);
  assert.equal(JSON.stringify(result).includes('"workout_id"'), false);
  assert.equal(JSON.stringify(result).includes('"user_id"'), false);
  assert.equal(JSON.stringify(result).includes("Privat note"), false);
  entries[0] = entry("1", current.id, "machine", 80, 2);
  assert.equal(result.exercises![0].sets[0].kind === "strength" && result.exercises![0].sets[0].weightKg, 0);
});
