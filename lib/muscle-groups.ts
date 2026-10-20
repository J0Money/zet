import type { MuscleGroup } from "@/lib/types";

// Fast rækkefølge og danske navne, så UI'en viser muskelgrupperne konsistent.
export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "full_body",
];

export const muscleGroupLabel: Record<MuscleGroup, string> = {
  chest: "Bryst",
  back: "Ryg",
  shoulders: "Skuldre",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Ben",
  core: "Core",
  full_body: "Helkrop",
};
