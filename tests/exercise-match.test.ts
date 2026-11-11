import assert from "node:assert/strict";
import { test } from "node:test";
import { findExerciseMatches, matchKey } from "../lib/exercise-match";
import type { Exercise } from "../lib/types";

const exercise = (name: string, group_name: string | null = null, type: "strength" | "cardio" = "strength") =>
  ({ id: name, name, group_name, equipment: null, type, user_id: null, muscle_groups: [] }) as Exercise;

const list = [
  exercise("Leg curl (Maskine)", "Leg curl"),
  exercise("Leg curl"),
  exercise("Bench press (Stang)", "Bench press"),
  exercise("Pull-ups"),
  exercise("Cable crunches"),
  exercise("Rumanian deadlift"),
  exercise("Row (Kabel)", "Row"),
  exercise("Seated row"),
  exercise("Running", null, "cardio"),
];

test("Samme bevægelse giver samme nøgle", () => {
  assert.equal(matchKey("Leg Curls"), matchKey("leg-curl"));
  assert.equal(matchKey("Pull ups"), matchKey("Pull-ups"));
  assert.equal(matchKey("Cable crunch"), matchKey("Cable crunches"));
  assert.equal(matchKey("Bænkpres"), matchKey("Bench press"));
  assert.equal(matchKey("Squat (Barbell)"), matchKey("squat"));
  assert.equal(matchKey("Squat (Stang)"), matchKey("Squat"));
  assert.notEqual(matchKey("Leg press"), matchKey("Leg pres curl"));
  assert.notEqual(matchKey("Tricep extensions (single arm)"), matchKey("Tricep extensions"));
});

test("Præcis match findes på tværs af stavning, flertal, sprog og udstyr", () => {
  assert.equal(findExerciseMatches("Leg Curls", "strength", list).exact, "Leg curl");
  assert.equal(findExerciseMatches(" bænkpres ", "strength", list).exact, "Bench press");
  assert.equal(findExerciseMatches("Pull up", "strength", list).exact, "Pull-ups");
  assert.equal(findExerciseMatches("Row (Cable)", "strength", list).exact, "Row");
  assert.equal(findExerciseMatches("Løb", "cardio", list).exact, "Running");
});

test("Gamle navne fra sammenlægning peger på den øvelse, de blev lagt ind i", () => {
  const aliases = [{ alias: "Incline chest press", base_name: "Incline bench press", type: "strength" as const }];
  const withIncline = [...list, exercise("Incline bench press (Barbell)", "Incline bench press")];
  assert.equal(findExerciseMatches("incline chest press", "strength", withIncline, aliases).exact, "Incline bench press");
  assert.equal(findExerciseMatches("Incline chest press", "strength", withIncline).exact, null);
  assert.equal(findExerciseMatches("Incline chest press", "cardio", withIncline, aliases).exact, null);
});

test("Typen holdes adskilt, og hver bevægelse nævnes kun én gang", () => {
  assert.deepEqual(findExerciseMatches("Running", "strength", list), { exact: null, similar: [] });
  assert.deepEqual(findExerciseMatches("Leg curl", "strength", list), { exact: "Leg curl", similar: [] });
});

test("Stavefejl og navne med de samme ord foreslås, men spærrer ikke", () => {
  assert.deepEqual(findExerciseMatches("Romanian deadlift", "strength", list), { exact: null, similar: ["Rumanian deadlift"] });
  assert.deepEqual(findExerciseMatches("Standing row", "strength", list), { exact: null, similar: ["Row"] });
  assert.deepEqual(findExerciseMatches("Hip thrust", "strength", list), { exact: null, similar: [] });
  assert.deepEqual(findExerciseMatches("", "strength", list), { exact: null, similar: [] });
});
