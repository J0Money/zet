import { EQUIPMENT } from "./equipment";
import { MUSCLE_GROUPS } from "./muscle-groups";
import type { WheelKey } from "./exercise-groups";
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

export type StrengthDraft = {
  submissionId: string;
  selectedTags: MuscleGroup[];
  selectedProgramId: string | null;
  searchQuery: string;
  selectedChoiceKey: string | null;
  slotByChoice: Record<string, WheelKey>;
  sets: { id: number; reps: string; weightKg: string }[];
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
    selectedChoiceKey: null, slotByChoice: {}, sets: [{ id: 0, reps: "", weightKg: "" }],
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
function withSubmissionId<T extends { submissionId: string }>(value: Record<string, unknown>): T {
  return { ...value, submissionId: isSubmissionId(value.submissionId) ? value.submissionId : newSubmissionId() } as T;
}

export function parseStrengthDraft(value: unknown): StrengthDraft | null {
  return isStoredStrengthDraft(value) ? withSubmissionId<StrengthDraft>(value) : null;
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
      typeof slot === "string" && (slot === "none" || (EQUIPMENT as readonly string[]).includes(slot)))
    && Array.isArray(value.sets) && value.sets.length > 0 && value.sets.length <= 100
    && value.sets.every((row) => object(row) && Number.isSafeInteger(row.id)
      && Number(row.id) >= 0 && text(row.reps) && text(row.weightKg))
    && new Set(value.sets.map((row) => row.id)).size === value.sets.length;
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
export function parseDraft<T>(raw: string | null, parse: (value: unknown) => T | null, now = Date.now()): T | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const stored: unknown = JSON.parse(raw);
    if (!object(stored) || typeof stored.savedAt !== "number") return null;
    // Et tidspunkt i fremtiden (forkert ur) tæller også som ugyldigt.
    const age = now - stored.savedAt;
    if (!(age >= -60_000 && age <= DRAFT_MAX_AGE_MS)) return null;
    return parse(stored.value);
  } catch { return null; }
}
export function clearAllDrafts(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key?.startsWith(DRAFT_KEY_PREFIX) ?? false);
  for (const key of keys) storage.removeItem(key);
}
