import assert from "node:assert/strict";
import { test } from "node:test";
import { clearAllDrafts, draftKey, DRAFT_MAX_AGE_MS, emptyStrengthDraft, emptyCardioDraft, isSubmissionId, newSubmissionId, parseStrengthDraft, parseCardioDraft, parseDraft, serializeDraft } from "../lib/log-draft";

const now = Date.UTC(2026, 9, 30, 12);

test("Kladden bevarer flere sæt, udstyr og decimaler", () => {
  const draft = { ...emptyStrengthDraft(), selectedChoiceKey: "group:Squat",
    slotByChoice: { "group:Squat": "machine" },
    sets: [{ id: 4, reps: "8", weightKg: "42.5" }, { id: 9, reps: "", weightKg: "40" }] };
  assert.deepEqual(parseDraft(serializeDraft(draft, now), parseStrengthDraft, now), draft);
  const cardio = { ...emptyCardioDraft(), distanceKm: "5.5", minutes: "24", seconds: "09" };
  assert.deepEqual(parseDraft(serializeDraft(cardio, now), parseCardioDraft, now), cardio);
});

test("Ødelagte og ugyldige kladder afvises uden at stoppe formularen", () => {
  const strength = emptyStrengthDraft();
  for (const raw of [null, "{", "null", "[]", JSON.stringify(strength),
    serializeDraft({ ...strength, sets: [] }, now),
    serializeDraft({ ...strength, sets: [{ id: 0, reps: 8, weightKg: "20" }] }, now),
    serializeDraft({ ...strength, sets: [strength.sets[0], strength.sets[0]] }, now),
    serializeDraft({ ...strength, slotByChoice: { squat: "invalid" } }, now),
    serializeDraft({ ...strength, submissionId: "ikke-et-id" }, now)]) {
    assert.equal(parseDraft(raw, parseStrengthDraft, now), null);
  }
  assert.equal(parseDraft(serializeDraft({ ...emptyCardioDraft(), minutes: {} }, now), parseCardioDraft, now), null);
});

test("Kladder udløber efter 2 dage", () => {
  const cardio = emptyCardioDraft();
  const draft = serializeDraft(cardio, now);
  assert.deepEqual(parseDraft(draft, parseCardioDraft, now + DRAFT_MAX_AGE_MS), cardio);
  assert.equal(parseDraft(draft, parseCardioDraft, now + DRAFT_MAX_AGE_MS + 1), null);
  assert.equal(parseDraft(serializeDraft(cardio, now + 24 * 60 * 60 * 1000), parseCardioDraft, now), null);
});

test("Brugere og træningstyper har adskilte kladder", () => {
  assert.notEqual(draftKey("first", "strength"), draftKey("second", "strength"));
  assert.notEqual(draftKey("first", "strength"), draftKey("first", "cardio"));
  assert.equal(parseDraft(serializeDraft(emptyCardioDraft(), now), parseStrengthDraft, now), null);
});

test("Hver ny kladde får sit eget engangs-id, og id'et følger kladden", () => {
  const first = emptyStrengthDraft();
  const second = emptyStrengthDraft();
  assert.ok(isSubmissionId(first.submissionId) && isSubmissionId(second.submissionId));
  assert.notEqual(first.submissionId, second.submissionId);
  assert.notEqual(emptyCardioDraft().submissionId, emptyCardioDraft().submissionId);
  // Samme kladde, læst igen efter en genindlæsning, sender samme id.
  assert.equal(parseDraft(serializeDraft(first, now), parseStrengthDraft, now)?.submissionId, first.submissionId);
  assert.ok(isSubmissionId(newSubmissionId()));
  assert.equal(isSubmissionId("x"), false);
  assert.equal(isSubmissionId(42), false);
});

test("Kladder gemt før engangs-id'et beholdes og får et nyt id", () => {
  const strength: Record<string, unknown> = { ...emptyStrengthDraft(), sets: [{ id: 3, reps: "5", weightKg: "100" }] };
  delete strength.submissionId;
  const restored = parseDraft(serializeDraft(strength, now), parseStrengthDraft, now);
  assert.ok(restored && isSubmissionId(restored.submissionId));
  assert.deepEqual(restored.sets, [{ id: 3, reps: "5", weightKg: "100" }]);
  const cardio: Record<string, unknown> = { ...emptyCardioDraft(), distanceKm: "3" };
  delete cardio.submissionId;
  const restoredCardio = parseDraft(serializeDraft(cardio, now), parseCardioDraft, now);
  assert.ok(restoredCardio && isSubmissionId(restoredCardio.submissionId));
  assert.equal(restoredCardio.distanceKm, "3");
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
