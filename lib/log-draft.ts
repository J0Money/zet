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
export function draftKey(userId: string, kind: string) {
  return `zet:log-draft:v1:${userId}:${kind}`;
}
export function parseDraft<T>(raw: string | null, validate: (value: unknown) => value is T): T | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : null;
  } catch { return null; }
}
