import assert from "node:assert/strict";
import { test } from "node:test";
import { clearAllDrafts, draftKey, DRAFT_MAX_AGE_MS, emptyStrengthDraft, emptyCardioDraft, isStrengthDraft, isCardioDraft, parseDraft, serializeDraft } from "../lib/log-draft";

const now = Date.UTC(2026, 9, 30, 12);

test("Kladden bevarer flere sæt, udstyr og decimaler", () => {
  const draft = { ...emptyStrengthDraft, selectedChoiceKey: "group:Squat",
    slotByChoice: { "group:Squat": "machine" },
    sets: [{ id: 4, reps: "8", weightKg: "42.5" }, { id: 9, reps: "", weightKg: "40" }] };
  assert.deepEqual(parseDraft(serializeDraft(draft, now), isStrengthDraft, now), draft);
  const cardio = { ...emptyCardioDraft, distanceKm: "5.5", minutes: "24", seconds: "09" };
  assert.deepEqual(parseDraft(serializeDraft(cardio, now), isCardioDraft, now), cardio);
});

test("Ødelagte og ugyldige kladder afvises uden at stoppe formularen", () => {
  for (const raw of [null, "{", "null", "[]", JSON.stringify(emptyStrengthDraft),
    serializeDraft({ ...emptyStrengthDraft, sets: [] }, now),
    serializeDraft({ ...emptyStrengthDraft, sets: [{ id: 0, reps: 8, weightKg: "20" }] }, now),
    serializeDraft({ ...emptyStrengthDraft, sets: [emptyStrengthDraft.sets[0], emptyStrengthDraft.sets[0]] }, now),
    serializeDraft({ ...emptyStrengthDraft, slotByChoice: { squat: "invalid" } }, now)]) {
    assert.equal(parseDraft(raw, isStrengthDraft, now), null);
  }
  assert.equal(parseDraft(serializeDraft({ ...emptyCardioDraft, minutes: {} }, now), isCardioDraft, now), null);
});

test("Kladder udløber efter 2 dage", () => {
  const draft = serializeDraft(emptyCardioDraft, now);
  assert.deepEqual(parseDraft(draft, isCardioDraft, now + DRAFT_MAX_AGE_MS), emptyCardioDraft);
  assert.equal(parseDraft(draft, isCardioDraft, now + DRAFT_MAX_AGE_MS + 1), null);
  assert.equal(parseDraft(serializeDraft(emptyCardioDraft, now + 24 * 60 * 60 * 1000), isCardioDraft, now), null);
});

test("Brugere og træningstyper har adskilte kladder", () => {
  assert.notEqual(draftKey("first", "strength"), draftKey("second", "strength"));
  assert.notEqual(draftKey("first", "strength"), draftKey("first", "cardio"));
  assert.equal(parseDraft(serializeDraft(emptyCardioDraft, now), isStrengthDraft, now), null);
});

test("Logout rydder alle kladder, også ældre versioner, men intet andet", () => {
  const data = new Map<string, string>([[draftKey("a", "strength"), "x"], ["zet:log-draft:v1:a:cardio", "y"], ["zet-theme", "dark"]]);
  const storage = {
    get length() { return data.size; },
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key); },
  } as Storage;
  clearAllDrafts(storage);
  assert.deepEqual([...data.keys()], ["zet-theme"]);
});
