import { MUSCLE_GROUPS } from "./muscle-groups";
import { parseSlotKey } from "./exercise-side";
import type { MuscleGroup } from "./types";

// Engangs-id for én indtastning. Serveren gemmer hvert id højst én gang, så et
// nyt tryk på Gem efter et tabt svar ikke giver dubletter. Id'et følger kladden
// (også efter genindlæsning) og skiftes først efter et bekræftet gem.
export function newSubmissionId(): string {
  const webCrypto = globalThis.crypto;
  // randomUUID findes kun på https og localhost, getRandomValues findes altid.
  if (typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
  const bytes = webCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function isSubmissionId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Id'et må kun genbruges for præcis samme indtastning. Ændres noget i kladden
// efter et tabt svar (fx et ekstra sæt), skal det nye indhold have et nyt id,
// ellers ville serveren se det som en gentagelse og smide ændringen væk.
// Alle felter tæller med, også søgning og filtre: de kan skifte den øvelse,
// der gemmes på, og en genindlæsning uden ændringer beholder stadig id'et.
export function reviseSubmissionId<T extends { submissionId: string }>(previous: T, next: T): T {
  if (next === previous || next.submissionId !== previous.submissionId) return next;
  // Uafsluttede huskenoter (noteDrafts) tæller ikke med: de bliver aldrig sendt
  // med Gem-knappen, så en ændret note er ikke et ændret sæt.
  const unchanged = JSON.stringify({ ...previous, submissionId: null, noteDrafts: null })
    === JSON.stringify({ ...next, submissionId: null, noteDrafts: null });
  return unchanged ? next : { ...next, submissionId: newSubmissionId() };
}

export type StrengthDraft = {
  submissionId: string;
  selectedTags: MuscleGroup[];
  selectedProgramId: string | null;
  searchQuery: string;
  selectedChoiceKey: string | null;
  // Tekst fra slotKey: udstyr og eventuelt side, fx "cable" eller "cable:single_arm".
  slotByChoice: Record<string, string>;
  sets: { id: number; reps: string; weightKg: string }[];
  // Uafsluttet huskenote pr. øvelsesvariant (nøgle: "øvelsesgruppe:udstyr").
  // En nøgle findes kun, mens noten er åben til redigering. Ældre kladder har
  // ikke feltet og får en tom liste.
  noteDrafts: Record<string, string>;
};
export type CardioDraft = {
  submissionId: string;
  selectedProgramId: string | null;
  searchQuery: string;
  exerciseId: string;
  distanceKm: string;
  minutes: string;
  seconds: string;
};
export function emptyStrengthDraft(): StrengthDraft {
  return {
    submissionId: newSubmissionId(), selectedTags: [], selectedProgramId: null, searchQuery: "",
    selectedChoiceKey: null, slotByChoice: {}, sets: [{ id: 0, reps: "", weightKg: "" }], noteDrafts: {},
  };
}
export function emptyCardioDraft(): CardioDraft {
  return {
    submissionId: newSubmissionId(), selectedProgramId: null, searchQuery: "",
    exerciseId: "", distanceKm: "", minutes: "", seconds: "0",
  };
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 500;
const nullableText = (value: unknown) => value === null || text(value);
// Kladder gemt før engangs-id'et fandtes har intet id. De beholdes og får et nyt.
const optionalSubmissionId = (value: unknown) => value === undefined || isSubmissionId(value);
// Kladder gemt før huskenoter fandt sted har intet noteDrafts-felt.
const optionalNoteDrafts = (value: unknown) => value === undefined
  || (object(value) && Object.keys(value).length <= 100
    && Object.entries(value).every(([key, note]) => key.length <= 200 && text(note)));
function withSubmissionId<T extends { submissionId: string }>(value: Record<string, unknown>): T {
  return { ...value, submissionId: isSubmissionId(value.submissionId) ? value.submissionId : newSubmissionId() } as T;
}

export function parseStrengthDraft(value: unknown): StrengthDraft | null {
  return isStoredStrengthDraft(value)
    ? { ...withSubmissionId<StrengthDraft>(value), noteDrafts: (value.noteDrafts ?? {}) as Record<string, string> }
    : null;
}
export function parseCardioDraft(value: unknown): CardioDraft | null {
  return isStoredCardioDraft(value) ? withSubmissionId<CardioDraft>(value) : null;
}
function isStoredStrengthDraft(value: unknown): value is Record<string, unknown> {
  return object(value) && optionalSubmissionId(value.submissionId)
    && nullableText(value.selectedProgramId) && text(value.searchQuery)
    && nullableText(value.selectedChoiceKey)
    && Array.isArray(value.selectedTags) && value.selectedTags.every((tag) => MUSCLE_GROUPS.includes(tag))
    && object(value.slotByChoice) && Object.values(value.slotByChoice).every((slot) =>
      parseSlotKey(slot) !== null)
    && Array.isArray(value.sets) && value.sets.length > 0 && value.sets.length <= 100
    && value.sets.every((row) => object(row) && Number.isSafeInteger(row.id)
      && Number(row.id) >= 0 && text(row.reps) && text(row.weightKg))
    && new Set(value.sets.map((row) => row.id)).size === value.sets.length
    && optionalNoteDrafts(value.noteDrafts);
}
function isStoredCardioDraft(value: unknown): value is Record<string, unknown> {
  return object(value) && optionalSubmissionId(value.submissionId) && nullableText(value.selectedProgramId)
    && [value.searchQuery, value.exerciseId, value.distanceKm, value.minutes, value.seconds].every(text);
}
// Alle versioner af kladdenøgler starter med dette, så logout kan rydde dem samlet.
export const DRAFT_KEY_PREFIX = "zet:log-draft:";
// Kladder gemmes kun i browseren og udløber efter 2 dage (aftalt med Joachim).
export const DRAFT_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

export function draftKey(userId: string, kind: string) {
  return `${DRAFT_KEY_PREFIX}v2:${userId}:${kind}`;
}
export function serializeDraft(value: unknown, now = Date.now()) {
  return JSON.stringify({ savedAt: now, value });
}
export type DraftClearReason = "expired" | "unreadable";
export type DraftRead<T> =
  | { kind: "none" }
  | { kind: "draft"; value: T }
  // Kladden skal ryddes. hadContent siger, om der stod udfyldte felter i den.
  | { kind: "cleared"; reason: DraftClearReason; hadContent: boolean };

const filled = (value: unknown) => typeof value === "string" && value.trim() !== "";
// Rummelige tjek, der også virker på kladder, som ikke består valideringen.
// Standardværdien 0 sekunder og tomme felter tæller ikke som indhold.
export function strengthDraftHasContent(value: unknown): boolean {
  if (!object(value)) return false;
  return (Array.isArray(value.sets) && value.sets.some((row) => object(row) && (filled(row.reps) || filled(row.weightKg))))
    || (object(value.noteDrafts) && Object.values(value.noteDrafts).some(filled));
}
export function cardioDraftHasContent(value: unknown): boolean {
  return object(value) && (filled(value.distanceKm) || filled(value.minutes));
}

// Læser en gemt kladde og siger, hvorfor den evt. skal ryddes. Rører ikke ved
// lageret, så den kan bruges under rendering og i tests.
export function readDraft<T>(
  raw: string | null,
  parse: (value: unknown) => T | null,
  hasContent: (value: unknown) => boolean = () => false,
  now = Date.now(),
): DraftRead<T> {
  if (!raw) return { kind: "none" };
  // Kan indholdet ikke læses, ved vi ikke, om der stod noget i det: vis så beskeden.
  if (raw.length > 100_000) return { kind: "cleared", reason: "unreadable", hadContent: true };
  let stored: unknown;
  try { stored = JSON.parse(raw); } catch { return { kind: "cleared", reason: "unreadable", hadContent: true }; }
  if (!object(stored) || typeof stored.savedAt !== "number") {
    return { kind: "cleared", reason: "unreadable", hadContent: false };
  }
  const hadContent = hasContent(stored.value);
  const age = now - stored.savedAt;
  // Et tidspunkt i fremtiden (forkert ur) tæller også som ugyldigt.
  if (age > DRAFT_MAX_AGE_MS) return { kind: "cleared", reason: "expired", hadContent };
  if (age < -60_000) return { kind: "cleared", reason: "unreadable", hadContent };
  try {
    const value = parse(stored.value);
    return value === null ? { kind: "cleared", reason: "unreadable", hadContent } : { kind: "draft", value };
  } catch { return { kind: "cleared", reason: "unreadable", hadContent }; }
}
export function parseDraft<T>(raw: string | null, parse: (value: unknown) => T | null, now = Date.now()): T | null {
  const result = readDraft(raw, parse, undefined, now);
  return result.kind === "draft" ? result.value : null;
}
// Læsning og skrivning mod lageret, der aldrig kaster. failed betyder, at lageret
// ikke kan bruges (privat fane, fuld eller blokeret lagring), så formularen kan
// sige det til brugeren i stedet for at tie.
export function loadDraft<T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  parse: (value: unknown) => T | null,
  hasContent?: (value: unknown) => boolean,
  now = Date.now(),
): { result: DraftRead<T>; raw: string | null; failed: boolean } {
  try {
    const raw = storage.getItem(key);
    return { result: readDraft(raw, parse, hasContent, now), raw, failed: false };
  } catch { return { result: { kind: "none" }, raw: null, failed: true }; }
}
export function saveDraft(storage: Pick<Storage, "setItem">, key: string, value: unknown, now = Date.now()): boolean {
  try { storage.setItem(key, serializeDraft(value, now)); return true; } catch { return false; }
}

export const DRAFT_NOTICE_TEXT: Record<DraftClearReason, string> = {
  expired: "Din gamle kladde blev ryddet, fordi den var over 2 dage gammel.",
  unreadable: "Din gamle kladde kunne ikke læses og blev ryddet.",
};
export const DRAFT_STORAGE_FAILED_TEXT = "Din kladde kan ikke gemmes i denne browser. Gem dine indtastninger, før du lukker siden.";

export function clearAllDrafts(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key?.startsWith(DRAFT_KEY_PREFIX) ?? false);
  for (const key of keys) storage.removeItem(key);
}

// Står der udfyldte, ugemte sæt eller cardio i kladderne? Bruges af Afslut-knappen.
// Tomme felter og standardværdien 0 sekunder tæller ikke som indtastning.
export function hasUnsavedEntries(storage: Pick<Storage, "getItem">, userId: string, now = Date.now()): boolean {
  try {
    const strength = parseDraft(storage.getItem(draftKey(userId, "strength")), parseStrengthDraft, now);
    if (strength?.sets.some((row) => row.reps.trim() !== "" || row.weightKg.trim() !== "")) return true;
    const cardio = parseDraft(storage.getItem(draftKey(userId, "cardio")), parseCardioDraft, now);
    return Boolean(cardio && (cardio.distanceKm.trim() !== "" || cardio.minutes.trim() !== ""));
  } catch { return false; }
}
