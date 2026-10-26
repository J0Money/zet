import assert from "node:assert/strict";
import { test } from "node:test";
import { draftKey, emptyStrengthDraft, emptyCardioDraft, isStrengthDraft, isCardioDraft, parseDraft } from "../lib/log-draft";

test("Kladden bevarer flere sæt, udstyr og decimaler", () => {
  const draft = { ...emptyStrengthDraft, selectedChoiceKey: "group:Squat",
    slotByChoice: { "group:Squat": "machine" },
    sets: [{ id: 4, reps: "8", weightKg: "42.5" }, { id: 9, reps: "", weightKg: "40" }] };
  assert.deepEqual(parseDraft(JSON.stringify(draft), isStrengthDraft), draft);
  const cardio = { ...emptyCardioDraft, distanceKm: "5.5", minutes: "24", seconds: "09" };
  assert.deepEqual(parseDraft(JSON.stringify(cardio), isCardioDraft), cardio);
});

test("Ødelagte og ugyldige kladder afvises uden at stoppe formularen", () => {
  for (const raw of [null, "{", "null", "[]", JSON.stringify({ ...emptyStrengthDraft, sets: [] }),
    JSON.stringify({ ...emptyStrengthDraft, sets: [{ id: 0, reps: 8, weightKg: "20" }] }),
    JSON.stringify({ ...emptyStrengthDraft, sets: [emptyStrengthDraft.sets[0], emptyStrengthDraft.sets[0]] }),
    JSON.stringify({ ...emptyStrengthDraft, slotByChoice: { squat: "invalid" } })]) {
    assert.equal(parseDraft(raw, isStrengthDraft), null);
  }
  assert.equal(parseDraft(JSON.stringify({ ...emptyCardioDraft, minutes: {} }), isCardioDraft), null);
});

test("Brugere og træningstyper har adskilte kladder", () => {
  assert.notEqual(draftKey("first", "strength"), draftKey("second", "strength"));
  assert.notEqual(draftKey("first", "strength"), draftKey("first", "cardio"));
  assert.equal(parseDraft(JSON.stringify(emptyCardioDraft), isStrengthDraft), null);
});
