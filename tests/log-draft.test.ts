import assert from "node:assert/strict";
import { test } from "node:test";
import { cardioDraftHasContent, DRAFT_NOTICE_TEXT, DRAFT_STORAGE_FAILED_TEXT, loadDraft, readDraft, saveDraft, strengthDraftHasContent, hasUnsavedEntries, clearAllDrafts, draftKey, DRAFT_MAX_AGE_MS, emptyStrengthDraft, emptyCardioDraft, isSubmissionId, newSubmissionId, parseStrengthDraft, parseCardioDraft, parseDraft, reviseSubmissionId, serializeDraft } from "../lib/log-draft";

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

test("Ændret indhold giver nyt engangs-id, uændret indhold beholder det", () => {
  const draft = { ...emptyStrengthDraft(), sets: [{ id: 0, reps: "8", weightKg: "60" }] };
  // Uændret (fx samme værdi sat igen): samme id.
  assert.equal(reviseSubmissionId(draft, { ...draft, sets: [{ id: 0, reps: "8", weightKg: "60" }] }).submissionId, draft.submissionId);
  // Et ekstra sæt, rettet vægt og andet udstyr: nyt id hver gang.
  for (const next of [
    { ...draft, sets: [...draft.sets, { id: 1, reps: "8", weightKg: "60" }] },
    { ...draft, sets: [{ id: 0, reps: "8", weightKg: "62.5" }] },
    { ...draft, slotByChoice: { "group:Squat": "machine" as const } },
    { ...draft, selectedChoiceKey: "group:Squat" },
  ]) {
    const revised = reviseSubmissionId(draft, next);
    assert.ok(isSubmissionId(revised.submissionId));
    assert.notEqual(revised.submissionId, draft.submissionId);
    assert.deepEqual(revised.sets, next.sets);
  }
  // Et id, der allerede er skiftet (efter et bekræftet gem), røres ikke.
  const afterSave = { ...draft, submissionId: newSubmissionId(), sets: [{ id: 0, reps: "", weightKg: "" }] };
  assert.equal(reviseSubmissionId(draft, afterSave).submissionId, afterSave.submissionId);
  const cardio = { ...emptyCardioDraft(), exerciseId: "run", distanceKm: "5", minutes: "25" };
  assert.equal(reviseSubmissionId(cardio, { ...cardio }).submissionId, cardio.submissionId);
  for (const change of [{ distanceKm: "5.2" }, { minutes: "26" }, { seconds: "10" }, { exerciseId: "bike" }]) {
    assert.notEqual(reviseSubmissionId(cardio, { ...cardio, ...change }).submissionId, cardio.submissionId);
  }
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

test("Uafsluttede huskenoter gemmes i kladden og overlever genindlæsning", () => {
  const draft = { ...emptyStrengthDraft(), noteDrafts: { "group:Squat:machine": "Sæde 4", "group:Row:none": "" } };
  assert.deepEqual(parseDraft(serializeDraft(draft, now), parseStrengthDraft, now)?.noteDrafts, draft.noteDrafts);
  assert.deepEqual(emptyStrengthDraft().noteDrafts, {});
});

test("Kladder uden noteDrafts kan stadig læses og får en tom liste", () => {
  const old: Record<string, unknown> = { ...emptyStrengthDraft(), sets: [{ id: 2, reps: "6", weightKg: "80" }] };
  delete old.noteDrafts;
  const restored = parseDraft(serializeDraft(old, now), parseStrengthDraft, now);
  assert.ok(restored);
  assert.deepEqual(restored.noteDrafts, {});
  assert.deepEqual(restored.sets, [{ id: 2, reps: "6", weightKg: "80" }]);
  // Også kladder fra før engangs-id'et: begge felter mangler.
  delete old.submissionId;
  const oldest = parseDraft(serializeDraft(old, now), parseStrengthDraft, now);
  assert.ok(oldest && isSubmissionId(oldest.submissionId));
  assert.deepEqual(oldest.noteDrafts, {});
});

test("Ugyldige noteDrafts afvises: forkert type, for lang tekst, for mange", () => {
  const strength = emptyStrengthDraft();
  const tooMany = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`k${index}`, "x"]));
  for (const noteDrafts of [[], "tekst", null, { a: 5 }, { a: "x".repeat(501) }, { ["k".repeat(201)]: "x" }, tooMany]) {
    assert.equal(parseDraft(serializeDraft({ ...strength, noteDrafts }, now), parseStrengthDraft, now), null);
  }
});

test("En ændret huskenote giver ikke nyt engangs-id, men ændrede sæt gør", () => {
  const draft = { ...emptyStrengthDraft(), sets: [{ id: 0, reps: "8", weightKg: "60" }] };
  const withNote = { ...draft, noteDrafts: { "group:Squat:none": "Bænk 30" } as Record<string, string> };
  assert.equal(reviseSubmissionId(draft, withNote).submissionId, draft.submissionId);
  assert.equal(reviseSubmissionId(withNote, { ...withNote, noteDrafts: {} }).submissionId, draft.submissionId);
  const both = { ...withNote, sets: [{ id: 0, reps: "9", weightKg: "60" }] };
  assert.notEqual(reviseSubmissionId(draft, both).submissionId, draft.submissionId);
});

test("Afslut ser kun udfyldte, ugemte sæt og cardio", () => {
  const storage = (entries: Record<string, string>) => ({ getItem: (key: string) => entries[key] ?? null });
  const strengthKey = draftKey("u1", "strength");
  const cardioKey = draftKey("u1", "cardio");
  assert.equal(hasUnsavedEntries(storage({}), "u1", now), false);
  assert.equal(hasUnsavedEntries(storage({ [strengthKey]: serializeDraft(emptyStrengthDraft(), now), [cardioKey]: serializeDraft(emptyCardioDraft(), now) }), "u1", now), false);
  const filled = { ...emptyStrengthDraft(), sets: [{ id: 0, reps: "", weightKg: "" }, { id: 1, reps: "8", weightKg: "" }] };
  assert.equal(hasUnsavedEntries(storage({ [strengthKey]: serializeDraft(filled, now) }), "u1", now), true);
  assert.equal(hasUnsavedEntries(storage({ [cardioKey]: serializeDraft({ ...emptyCardioDraft(), minutes: "20" }, now) }), "u1", now), true);
  // En anden bruger, en udløbet kladde og en ødelagt kladde tæller ikke.
  assert.equal(hasUnsavedEntries(storage({ [strengthKey]: serializeDraft(filled, now) }), "u2", now), false);
  assert.equal(hasUnsavedEntries(storage({ [strengthKey]: serializeDraft(filled, now) }), "u1", now + DRAFT_MAX_AGE_MS + 1), false);
  assert.equal(hasUnsavedEntries(storage({ [strengthKey]: "{" }), "u1", now), false);
  // Kun en huskenote i kladden er ikke et ugemt sæt.
  const onlyNote = { ...emptyStrengthDraft(), noteDrafts: { "group:Squat:none": "tekst" } };
  assert.equal(hasUnsavedEntries(storage({ [strengthKey]: serializeDraft(onlyNote, now) }), "u1", now), false);
});

const withContent = { ...emptyStrengthDraft(), sets: [{ id: 0, reps: "8", weightKg: "60" }] };

test("Udløbet kladde med indhold ryddes med årsag, tom kladde ryddes uden besked", () => {
  const later = now + DRAFT_MAX_AGE_MS + 1;
  assert.deepEqual(readDraft(serializeDraft(withContent, now), parseStrengthDraft, strengthDraftHasContent, later),
    { kind: "cleared", reason: "expired", hadContent: true });
  assert.deepEqual(readDraft(serializeDraft(emptyStrengthDraft(), now), parseStrengthDraft, strengthDraftHasContent, later),
    { kind: "cleared", reason: "expired", hadContent: false });
  // Seks tegn i en note tæller som indhold, standardværdien 0 sekunder gør ikke.
  const note = { ...emptyStrengthDraft(), noteDrafts: { "group:Squat:none": "Sæde 4" } };
  assert.equal(readDraft(serializeDraft(note, now), parseStrengthDraft, strengthDraftHasContent, later).kind, "cleared");
  assert.equal((readDraft(serializeDraft(note, now), parseStrengthDraft, strengthDraftHasContent, later) as { hadContent: boolean }).hadContent, true);
  const cardio = readDraft(serializeDraft(emptyCardioDraft(), now), parseCardioDraft, cardioDraftHasContent, later);
  assert.deepEqual(cardio, { kind: "cleared", reason: "expired", hadContent: false });
  const cardioFilled = readDraft(serializeDraft({ ...emptyCardioDraft(), distanceKm: "5" }, now), parseCardioDraft, cardioDraftHasContent, later);
  assert.deepEqual(cardioFilled, { kind: "cleared", reason: "expired", hadContent: true });
  // En gyldig, ikke udløbet kladde ryddes ikke.
  assert.equal(readDraft(serializeDraft(withContent, now), parseStrengthDraft, strengthDraftHasContent, now).kind, "draft");
  assert.deepEqual(readDraft(null, parseStrengthDraft, strengthDraftHasContent, now), { kind: "none" });
  assert.deepEqual(readDraft("", parseStrengthDraft, strengthDraftHasContent, now), { kind: "none" });
});

test("Ulæselig kladde ryddes med årsag, og indholdet tælles stadig, når det kan ses", () => {
  // Gyldigt format, men et felt er for langt: kladden kan ikke bruges, men havde indhold.
  const tooLong = { ...withContent, searchQuery: "x".repeat(501) };
  assert.deepEqual(readDraft(serializeDraft(tooLong, now), parseStrengthDraft, strengthDraftHasContent, now),
    { kind: "cleared", reason: "unreadable", hadContent: true });
  const emptyButInvalid = { ...emptyStrengthDraft(), searchQuery: "x".repeat(501) };
  assert.deepEqual(readDraft(serializeDraft(emptyButInvalid, now), parseStrengthDraft, strengthDraftHasContent, now),
    { kind: "cleared", reason: "unreadable", hadContent: false });
  // Ødelagt tekst og for stor tekst: vi kan ikke se, hvad der stod, så der gives besked.
  assert.deepEqual(readDraft("{", parseStrengthDraft, strengthDraftHasContent, now), { kind: "cleared", reason: "unreadable", hadContent: true });
  assert.equal((readDraft("x".repeat(100_001), parseStrengthDraft, strengthDraftHasContent, now) as { reason: string }).reason, "unreadable");
  // Uden tidsstempel og ur i fremtiden.
  assert.equal(readDraft("[]", parseStrengthDraft, strengthDraftHasContent, now).kind, "cleared");
  assert.equal((readDraft(serializeDraft(withContent, now + 24 * 60 * 60 * 1000), parseStrengthDraft, strengthDraftHasContent, now) as { reason: string }).reason, "unreadable");
  // Uden hasContent (fx fanen Styrke/Cardio) giver ingen kladde besked.
  assert.equal((readDraft(serializeDraft(tooLong, now), parseStrengthDraft, undefined, now) as { hadContent: boolean }).hadContent, false);
  assert.ok(DRAFT_NOTICE_TEXT.expired.includes("2 dage") && DRAFT_NOTICE_TEXT.unreadable !== DRAFT_NOTICE_TEXT.expired);
  assert.ok(![DRAFT_NOTICE_TEXT.expired, DRAFT_NOTICE_TEXT.unreadable, DRAFT_STORAGE_FAILED_TEXT].some((text) => /[—–]/.test(text)));
});

test("Lager der kaster fejl: læsning og skrivning melder fejl i stedet for at stoppe", () => {
  const broken = {
    getItem: () => { throw new Error("blokeret"); },
    setItem: () => { throw new Error("fuldt"); },
  };
  const loaded = loadDraft(broken, "k", parseStrengthDraft, strengthDraftHasContent, now);
  assert.deepEqual(loaded, { result: { kind: "none" }, raw: null, failed: true });
  assert.equal(saveDraft(broken, "k", withContent, now), false);
  // Et fungerende lager: skriv og læs samme kladde tilbage.
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  assert.equal(saveDraft(storage, "k", withContent, now), true);
  const ok = loadDraft(storage, "k", parseStrengthDraft, strengthDraftHasContent, now);
  assert.equal(ok.failed, false);
  assert.deepEqual(ok.result, { kind: "draft", value: withContent });
  assert.equal(loadDraft(storage, "mangler", parseStrengthDraft, undefined, now).result.kind, "none");
});

test("Kladde fra en anden fane: tom kladde med nyt id erstatter de gemte sæt", () => {
  // Fane A gemmer, rydder og skriver en tom kladde med nyt engangs-id. Fane B læser den.
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const key = draftKey("u1", "strength");
  saveDraft(storage, key, withContent, now);
  const cleared = { ...withContent, submissionId: newSubmissionId(), sets: [{ id: 0, reps: "", weightKg: "" }] };
  saveDraft(storage, key, cleared, now + 1000);
  const seenByB = loadDraft(storage, key, parseStrengthDraft, undefined, now + 1000).result;
  assert.equal(seenByB.kind, "draft");
  if (seenByB.kind !== "draft") return;
  assert.notEqual(seenByB.value.submissionId, withContent.submissionId);
  assert.deepEqual(seenByB.value.sets, [{ id: 0, reps: "", weightKg: "" }]);
  // Samme indhold igen (fx B's eget ekko) er ens og skrives ikke tilbage: ingen løkke.
  assert.equal(JSON.stringify(seenByB.value), JSON.stringify(cleared));
});
