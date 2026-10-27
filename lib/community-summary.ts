import type { Entry, Exercise, StrengthEntry, Workout } from "./types";
import { formatWorkoutDuration } from "./format";

export type CommunitySummary = {
  // Mangler på gamle opslag, indtil ejeren vælger at dele detaljerne.
  exercises?: { name: string; sets: ({ kind: "strength"; weightKg: number; reps: number } | { kind: "cardio"; distanceKm: number; durationSec: number })[] }[];
  date: string;
  duration: string | null;
  strengthSets: number;
  cardioSessions: number;
  records: { exercise: string; weightKg: number; reps: number; previousWeightKg: number; previousReps: number }[];
};
const stronger = (a: StrengthEntry, b: StrengthEntry) =>
  a.weight_kg > b.weight_kg || (a.weight_kg === b.weight_kg && a.reps > b.reps);

// Kun eksplicit udvalgte oplysninger må komme med i et delt opslag.
export function buildCommunitySummary(workout: Workout, workouts: Workout[], entries: Entry[], exercises: Exercise[]): CommunitySummary | null {
  if (workout.started_at && !workout.ended_at) return null;
  const ownEntries = entries.filter((entry) => entry.workout_id === workout.id);
  if (!ownEntries.length) return null;
  const earlier = new Set(workouts.filter((other) => {
    if (other.id === workout.id || other.user_id !== workout.user_id || (other.started_at && !other.ended_at)) return false;
    if (other.date !== workout.date) return other.date < workout.date;
    return Boolean(other.ended_at && workout.started_at && other.ended_at <= workout.started_at);
  }).map((item) => item.id));
  const previous = new Map<string, StrengthEntry>();
  const current = new Map<string, StrengthEntry>();
  for (const entry of entries) {
    if (entry.kind !== "strength") continue;
    const target = entry.workout_id === workout.id ? current : earlier.has(entry.workout_id) ? previous : null;
    if (!target) continue;
    const best = target.get(entry.exercise_id);
    if (!best || stronger(entry, best)) target.set(entry.exercise_id, entry);
  }
  const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const sharedExercises = new Map<string, NonNullable<CommunitySummary["exercises"]>[number]>();
  for (const entry of ownEntries) {
    const group = sharedExercises.get(entry.exercise_id) ?? { name: names.get(entry.exercise_id) ?? "Øvelse", sets: [] };
    group.sets.push(entry.kind === "strength"
      ? { kind: "strength", weightKg: entry.weight_kg, reps: entry.reps }
      : { kind: "cardio", distanceKm: entry.distance_km, durationSec: entry.duration_sec });
    sharedExercises.set(entry.exercise_id, group);
  }
  const records: CommunitySummary["records"] = [];
  for (const [id, best] of current) {
    const before = previous.get(id);
    if (before && stronger(best, before)) records.push({
      exercise: names.get(id) ?? "Øvelse", weightKg: best.weight_kg, reps: best.reps,
      previousWeightKg: before.weight_kg, previousReps: before.reps,
    });
  }
  return {
    date: workout.date,
    duration: workout.started_at && workout.ended_at ? formatWorkoutDuration(workout.started_at, workout.ended_at) : null,
    strengthSets: ownEntries.filter((entry) => entry.kind === "strength").length,
    cardioSessions: ownEntries.filter((entry) => entry.kind === "cardio").length,
    records,
    exercises: [...sharedExercises.values()],
  };
}
