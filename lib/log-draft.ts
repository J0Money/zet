import { EQUIPMENT } from "./equipment";
import { MUSCLE_GROUPS } from "./muscle-groups";
import type { WheelKey } from "./exercise-groups";
import type { MuscleGroup } from "./types";

export type StrengthDraft = {
  selectedTags: MuscleGroup[];
  selectedProgramId: string | null;
  searchQuery: string;
  selectedChoiceKey: string | null;
  slotByChoice: Record<string, WheelKey>;
  sets: { id: number; reps: string; weightKg: string }[];
};
export type CardioDraft = {
  selectedProgramId: string | null;
  searchQuery: string;
  exerciseId: string;
  distanceKm: string;
  minutes: string;
  seconds: string;
};
export const emptyStrengthDraft: StrengthDraft = {
  selectedTags: [], selectedProgramId: null, searchQuery: "",
  selectedChoiceKey: null, slotByChoice: {}, sets: [{ id: 0, reps: "", weightKg: "" }],
};
export const emptyCardioDraft: CardioDraft = {
  selectedProgramId: null, searchQuery: "", exerciseId: "", distanceKm: "", minutes: "", seconds: "0",
};
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 500;
const nullableText = (value: unknown) => value === null || text(value);

export function isStrengthDraft(value: unknown): value is StrengthDraft {
  return object(value) && nullableText(value.selectedProgramId) && text(value.searchQuery)
    && nullableText(value.selectedChoiceKey)
    && Array.isArray(value.selectedTags) && value.selectedTags.every((tag) => MUSCLE_GROUPS.includes(tag))
    && object(value.slotByChoice) && Object.values(value.slotByChoice).every((slot) =>
      typeof slot === "string" && (slot === "none" || (EQUIPMENT as readonly string[]).includes(slot)))
    && Array.isArray(value.sets) && value.sets.length > 0 && value.sets.length <= 100
    && value.sets.every((row) => object(row) && Number.isSafeInteger(row.id)
      && Number(row.id) >= 0 && text(row.reps) && text(row.weightKg))
    && new Set(value.sets.map((row) => row.id)).size === value.sets.length;
}
export function isCardioDraft(value: unknown): value is CardioDraft {
  return object(value) && nullableText(value.selectedProgramId)
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
export function parseDraft<T>(raw: string | null, validate: (value: unknown) => value is T, now = Date.now()): T | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const stored: unknown = JSON.parse(raw);
    if (!object(stored) || typeof stored.savedAt !== "number") return null;
    // Et tidspunkt i fremtiden (forkert ur) tæller også som ugyldigt.
    const age = now - stored.savedAt;
    if (!(age >= -60_000 && age <= DRAFT_MAX_AGE_MS)) return null;
    return validate(stored.value) ? stored.value : null;
  } catch { return null; }
}
export function clearAllDrafts(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key?.startsWith(DRAFT_KEY_PREFIX) ?? false);
  for (const key of keys) storage.removeItem(key);
}
