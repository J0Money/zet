import assert from "node:assert/strict";
import { test } from "node:test";
import { getWeeklyMedal, getMedalCollection } from "../lib/workouts";
import type { Entry, Workout } from "../lib/types";
const workout = (id: string, date: string, active = false): Workout => ({ id, date, user_id: "test", notes: "", started_at: active ? `${date}T10:00:00Z` : null, ended_at: null });
const entry = (id: string): Entry => ({ id, workout_id: id, exercise_id: "exercise", kind: "cardio", distance_km: 1, duration_sec: 600 });

test("Højst én træning pr. dag, kun afsluttede pas med indhold og ingen fremtidige dage", () => {
  const workouts = [workout("a", "2026-10-26"), workout("b", "2026-10-26"), workout("empty", "2026-10-27"), workout("active", "2026-10-28", true), workout("future", "2026-10-29"), workout("past", "2026-10-25")];
  const result = getWeeklyMedal(workouts, ["a", "b", "active", "future", "past"].map(entry), "2026-10-28");
  assert.equal(result.count, 1);
  assert.equal(result.medal, null);
  assert.equal(result.next?.name, "Bronze");
  assert.equal(result.days[0].date, "2026-10-26");
  assert.equal(result.days[6].date, "2026-11-01");
  assert.deepEqual(result.days.map(day => day.trained), [true, false, false, false, false, false, false]);
});

test("Alle medaljegrænser og ny uge efter søndag", () => {
  const dates = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
  for (let count = 0; count <= 7; count++) {
    const workouts = dates.slice(0, count).map(date => workout(date, date));
    const result = getWeeklyMedal(workouts, workouts.map(w => entry(w.id)), "2026-11-01");
    assert.equal(result.count, count);
    assert.equal(result.medal?.name ?? null, [null, null, "Bronze", "Sølv", "Guld", "Diamant", "Diamant", "Diamant"][count]);
    assert.equal(result.next === null, count >= 5);
    assert.equal(getWeeklyMedal(workouts, workouts.map(w => entry(w.id)), "2026-11-02").count, 0);
  }
});

test("Afslutning, sletning og rettet dato afspejles i medaljen", () => {
  const w = workout("w", "2026-10-28", true);
  const e: Entry = { id: "s", workout_id: "w", exercise_id: "x", kind: "strength", reps: 10, weight_kg: 0 };
  assert.equal(getWeeklyMedal([w], [e], "2026-10-28").count, 0);
  w.ended_at = "2026-10-28T11:00:00Z";
  assert.equal(getWeeklyMedal([w], [e], "2026-10-28").count, 1);
  assert.equal(getWeeklyMedal([w], [], "2026-10-28").count, 0);
  w.date = "2026-10-25";
  assert.equal(getWeeklyMedal([w], [e], "2026-10-28").count, 0);
});

test("Samlingen indeholder kun medaljer fra afsluttede uger, nyeste først", () => {
  const dates = ["2025-12-29", "2026-01-01", "2026-01-02", "2026-10-19", "2026-10-20", "2026-10-20", "2026-10-12", "2026-10-26", "2026-10-27", "2026-11-02"];
  const workouts = dates.map((date, i) => workout(String(i), date));
  const entries = workouts.map(w => entry(w.id));
  const result = getMedalCollection(workouts, entries, "2026-10-28");
  assert.deepEqual(result.map(w => [w.start, w.end, w.count, w.medal.name]), [
    ["2026-10-19", "2026-10-25", 2, "Bronze"],
    ["2025-12-29", "2026-01-04", 3, "Sølv"],
  ]);
  assert.deepEqual(getMedalCollection(workouts, [], "2026-10-28"), []);
  workouts[4].started_at = "2026-10-20T10:00:00Z";
  workouts[5].started_at = "2026-10-20T11:00:00Z";
  assert.equal(getMedalCollection(workouts, entries, "2026-10-28").length, 1);
  assert.equal(getMedalCollection(workouts, entries, "2026-11-02")[0].start, "2026-10-26");
});

import { getISOWeek } from "../lib/dates";

test("Årsstænger bruger ISO-ugeåret ved nytår", () => {
  assert.deepEqual(getISOWeek("2025-12-29"), { week: 1, year: 2026 });
  assert.deepEqual(getISOWeek("2021-01-01"), { week: 53, year: 2020 });
  assert.deepEqual(getISOWeek("2026-09-28"), { week: 40, year: 2026 });
  const workouts = [workout("a", "2025-12-29"), workout("b", "2026-01-01")];
  const items = getMedalCollection(workouts, [entry("a"), entry("b")], "2026-01-05");
  assert.equal(items.length, 1);
  assert.equal(getISOWeek(items[0].start).year, 2026);
});
