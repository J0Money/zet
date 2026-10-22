// lib/types.ts

export type User = {
  id: string;
  email: string;
  name: string;
};

export type ExerciseType = "strength" | "cardio";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "core"
  | "full_body";

export type Exercise = {
  id: string;
  user_id: string | null; // null means shared across all users
  name: string;
  type: ExerciseType;
  muscle_groups: MuscleGroup[]; // e.g. dips is both chest and triceps
};

export type Workout = {
  id: string;
  user_id: string;
  date: string; // ISO date string, e.g. "2026-10-09"
  notes: string;
};

export type TrainingProgram = {
  id: string;
  user_id: string;
  name: string;
  is_published: boolean;
  exercise_ids: string[]; // in the order they were added to the program
};

type BaseEntry = {
  id: string;
  workout_id: string;
  exercise_id: string;
};

export type StrengthEntry = BaseEntry & {
  kind: "strength";
  reps: number;
  weight_kg: number;
};

export type CardioEntry = BaseEntry & {
  kind: "cardio";
  distance_km: number;
  duration_sec: number;
};

export type Entry = StrengthEntry | CardioEntry;
