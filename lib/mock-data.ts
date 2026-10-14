// lib/mock-data.ts

import type { Entry, Exercise, User, Workout } from "@/lib/types";

export const mockUsers: User[] = [
  { id: "user-1", email: "joe@example.com", name: "Joe" },
  { id: "user-2", email: "friend@example.com", name: "Alex" },
];

// user_id: null means the exercise is shared across all users.
export const mockExercises: Exercise[] = [
  { id: "exercise-1", user_id: null, name: "Bænkpres", type: "strength", muscle_group: "chest" },
  { id: "exercise-2", user_id: null, name: "Squat", type: "strength", muscle_group: "legs" },
  { id: "exercise-3", user_id: null, name: "Ro i maskine", type: "strength", muscle_group: "back" },
  { id: "exercise-4", user_id: null, name: "Skulderpres", type: "strength", muscle_group: "shoulders" },
  { id: "exercise-5", user_id: null, name: "Løb", type: "cardio", muscle_group: "full_body" },
];

export const mockWorkouts: Workout[] = [
  { id: "workout-1", user_id: "user-1", date: "2026-09-29", notes: "Første uge, føler mig frisk" },
  { id: "workout-2", user_id: "user-1", date: "2026-10-02", notes: "" },
  { id: "workout-3", user_id: "user-1", date: "2026-10-06", notes: "Løbetur i regnvejr" },
];

export const mockEntries: Entry[] = [
  // workout-1: bænkpres + squat
  { kind: "strength", id: "entry-1", workout_id: "workout-1", exercise_id: "exercise-1", reps: 8, weight_kg: 60 },
  { kind: "strength", id: "entry-2", workout_id: "workout-1", exercise_id: "exercise-1", reps: 8, weight_kg: 60 },
  { kind: "strength", id: "entry-3", workout_id: "workout-1", exercise_id: "exercise-2", reps: 6, weight_kg: 80 },

  // workout-2: ro + skulderpres
  { kind: "strength", id: "entry-4", workout_id: "workout-2", exercise_id: "exercise-3", reps: 10, weight_kg: 45 },
  { kind: "strength", id: "entry-5", workout_id: "workout-2", exercise_id: "exercise-4", reps: 8, weight_kg: 30 },

  // workout-3: løbetur
  { kind: "cardio", id: "entry-6", workout_id: "workout-3", exercise_id: "exercise-5", distance_km: 5.2, duration_sec: 1560 },
];
