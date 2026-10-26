// lib/workouts.ts

import { getTodayInCopenhagen } from "@/lib/dates";
import type { CardioEntry, Entry, Exercise, StrengthEntry, Workout } from "@/lib/types";

export type WorkoutSummary = {
  workout: Workout;
  exerciseNames: string[];
  strengthSetCount: number;
  cardioCount: number;
};

// limit = workouts.length gives every workout, newest first, which is what
// the full /history list needs, not only the dashboard's "latest 5".
export function getLatestWorkouts(
  workouts: Workout[],
  entries: Entry[],
  exercises: Exercise[],
  limit = 5,
): WorkoutSummary[] {
  const exerciseNameById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );

  // Nyeste dag først, og flere pas samme dag med det seneste startede først.
  return [...workouts]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.started_at ?? "").localeCompare(a.started_at ?? ""))
    .slice(0, limit)
    .map((workout) => {
      const workoutEntries = entries.filter((entry) => entry.workout_id === workout.id);
      const uniqueExerciseIds = [...new Set(workoutEntries.map((entry) => entry.exercise_id))];
      const exerciseNames = uniqueExerciseIds.map(
        (id) => exerciseNameById.get(id) ?? "Ukendt øvelse",
      );
      const strengthSetCount = workoutEntries.filter(
        (entry) => entry.kind === "strength",
      ).length;
      const cardioCount = workoutEntries.filter((entry) => entry.kind === "cardio").length;

      return { workout, exerciseNames, strengthSetCount, cardioCount };
    });
}

export type WeeklyTrainingSummary = {
  workoutCount: number;
  totalVolumeKg: number;
  cardio: {
    totalDistanceKm: number;
    totalDurationSec: number;
  };
};

// Week starts on Monday (Danish/ISO convention). Uses UTC-based Date methods
// throughout, since "YYYY-MM-DD" workout dates are parsed as UTC midnight
// (new Date("2026-10-13") is midnight UTC, not midnight in the server's own
// timezone). Mixing UTC-parsed dates with local-timezone methods like
// getDay()/setDate() would silently shift the week boundary depending on
// where the server happens to run.
function getStartOfWeek(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

export function getWeeklyTrainingSummary(
  workouts: Workout[],
  entries: Entry[],
  referenceDate: Date = new Date(getTodayInCopenhagen()),
): WeeklyTrainingSummary {
  const weekStart = getStartOfWeek(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const workoutsThisWeek = workouts.filter((workout) => {
    const workoutDate = new Date(workout.date);
    return workoutDate >= weekStart && workoutDate < weekEnd;
  });

  const workoutIdsThisWeek = new Set(workoutsThisWeek.map((workout) => workout.id));
  const entriesThisWeek = entries.filter((entry) =>
    workoutIdsThisWeek.has(entry.workout_id),
  );

  const strengthEntries = entriesThisWeek.filter(
    (entry): entry is StrengthEntry => entry.kind === "strength",
  );
  const totalVolumeKg = strengthEntries.reduce(
    (sum, entry) => sum + entry.reps * entry.weight_kg,
    0,
  );

  const cardioEntries = entriesThisWeek.filter(
    (entry): entry is CardioEntry => entry.kind === "cardio",
  );
  const totalDistanceKm = cardioEntries.reduce((sum, entry) => sum + entry.distance_km, 0);
  const totalDurationSec = cardioEntries.reduce((sum, entry) => sum + entry.duration_sec, 0);

  return {
    workoutCount: workoutsThisWeek.length,
    totalVolumeKg,
    cardio: { totalDistanceKm, totalDurationSec },
  };
}

export type WeeklyVolumePoint = {
  weekStart: string; // "YYYY-MM-DD" (mandag)
  totalVolumeKg: number;
  workoutCount: number;
};

// En sum pr. uge for de seneste `weeks` uger (inklusive den igangværende),
// ældste uge først, til et diagram der viser udviklingen over tid i stedet
// for kun "denne uge". Genbruger samme ugedefinition som
// getWeeklyTrainingSummary/getTrainingStreakWeeks ovenfor.
export function getWeeklyVolumeHistory(
  workouts: Workout[],
  entries: Entry[],
  weeks = 8,
  referenceDate: Date = new Date(getTodayInCopenhagen()),
): WeeklyVolumePoint[] {
  const currentWeekStart = getStartOfWeek(referenceDate);
  const points: WeeklyVolumePoint[] = [];

  for (let weeksAgo = weeks - 1; weeksAgo >= 0; weeksAgo--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weeksAgo * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const workoutsInWeek = workouts.filter((workout) => {
      const date = new Date(workout.date);
      return date >= weekStart && date < weekEnd;
    });
    const workoutIdsInWeek = new Set(workoutsInWeek.map((workout) => workout.id));
    const strengthEntries = entries.filter(
      (entry): entry is StrengthEntry => entry.kind === "strength" && workoutIdsInWeek.has(entry.workout_id),
    );
    const totalVolumeKg = strengthEntries.reduce((sum, entry) => sum + entry.reps * entry.weight_kg, 0);

    points.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      totalVolumeKg,
      workoutCount: workoutsInWeek.length,
    });
  }

  return points;
}

// Counts consecutive weeks (Monday-start) with at least one workout, newest first.
// The current, still-ongoing week is only counted if it already has a workout;
// otherwise we start counting from the last fully-tracked week, so the streak
// isn't broken just because you haven't trained yet this week.
export function getTrainingStreakWeeks(
  workouts: Workout[],
  referenceDate: Date = new Date(getTodayInCopenhagen()),
): number {
  const weekStartTimestamps = new Set(
    workouts.map((workout) => getStartOfWeek(new Date(workout.date)).getTime()),
  );

  const weekStart = getStartOfWeek(referenceDate);
  if (!weekStartTimestamps.has(weekStart.getTime())) {
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  }

  let streak = 0;
  while (weekStartTimestamps.has(weekStart.getTime())) {
    streak += 1;
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  }

  return streak;
}

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  date: string;
};

// A record is the heaviest weight ever lifted for an exercise.
// Ties (same weight) are broken by the set with the most reps.
export function getPersonalRecords(
  workouts: Workout[],
  entries: Entry[],
  exercises: Exercise[],
): PersonalRecord[] {
  const exerciseNameById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );
  const workoutDateById = new Map(
    workouts.map((workout) => [workout.id, workout.date]),
  );

  const strengthEntries = entries.filter(
    (entry): entry is StrengthEntry => entry.kind === "strength",
  );

  const bestEntryByExercise = new Map<string, StrengthEntry>();
  for (const entry of strengthEntries) {
    const current = bestEntryByExercise.get(entry.exercise_id);
    const isBetter =
      !current ||
      entry.weight_kg > current.weight_kg ||
      (entry.weight_kg === current.weight_kg && entry.reps > current.reps);

    if (isBetter) {
      bestEntryByExercise.set(entry.exercise_id, entry);
    }
  }

  return [...bestEntryByExercise.entries()]
    .map(([exerciseId, entry]) => ({
      exerciseId,
      exerciseName: exerciseNameById.get(exerciseId) ?? "Ukendt øvelse",
      weightKg: entry.weight_kg,
      reps: entry.reps,
      date: workoutDateById.get(entry.workout_id) ?? "",
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export type WeightProgressionPoint = {
  date: string;
  weightKg: number;
};

// One point per training day: the heaviest weight lifted that day for the exercise.
export function getWeightProgression(
  workouts: Workout[],
  entries: Entry[],
  exerciseId: string,
): WeightProgressionPoint[] {
  const workoutDateById = new Map(
    workouts.map((workout) => [workout.id, workout.date]),
  );

  const maxWeightByDate = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== "strength" || entry.exercise_id !== exerciseId) continue;

    const date = workoutDateById.get(entry.workout_id);
    if (!date) continue;

    const current = maxWeightByDate.get(date);
    if (current === undefined || entry.weight_kg > current) {
      maxWeightByDate.set(date, entry.weight_kg);
    }
  }

  return [...maxWeightByDate.entries()]
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type LoggedSet = { reps: number; weight_kg: number };

export type ExerciseHistory = {
  lastDate: string | null; // null, hvis øvelsen kun findes i det aktive pas
  lastSets: LoggedSet[];
  best: LoggedSet; // samme rekordregel som getPersonalRecords
};

// Pr. styrkeøvelse: sæt fra det seneste afsluttede pas og den bedste rekord.
// Det aktive pas (excludeWorkoutId) tæller ikke som "sidst", men er med i
// rekorden, så oversigten viser det forrige pas, mens man træner.
export function getExerciseHistory(
  workouts: Workout[],
  entries: Entry[],
  excludeWorkoutId?: string,
): Record<string, ExerciseHistory> {
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const latestWorkoutByExercise = new Map<string, Workout>();
  const best = new Map<string, LoggedSet>();

  for (const entry of entries) {
    if (entry.kind !== "strength") continue;
    const workout = workoutById.get(entry.workout_id);
    if (!workout) continue;
    const current = best.get(entry.exercise_id);
    if (
      !current ||
      entry.weight_kg > current.weight_kg ||
      (entry.weight_kg === current.weight_kg && entry.reps > current.reps)
    ) {
      best.set(entry.exercise_id, { reps: entry.reps, weight_kg: entry.weight_kg });
    }

    if (workout.id === excludeWorkoutId || (workout.started_at && !workout.ended_at)) continue;
    const latest = latestWorkoutByExercise.get(entry.exercise_id);
    const isNewer =
      !latest ||
      workout.date.localeCompare(latest.date) > 0 ||
      (workout.date === latest.date && (workout.started_at ?? "").localeCompare(latest.started_at ?? "") > 0);
    if (isNewer) latestWorkoutByExercise.set(entry.exercise_id, workout);
  }

  const history: Record<string, ExerciseHistory> = {};
  for (const [exerciseId, record] of best) {
    const latest = latestWorkoutByExercise.get(exerciseId);
    const lastSets = entries
      .filter((entry): entry is StrengthEntry => entry.kind === "strength" && entry.exercise_id === exerciseId && entry.workout_id === latest?.id)
      .map((entry) => ({ reps: entry.reps, weight_kg: entry.weight_kg }));
    history[exerciseId] = { lastDate: latest?.date ?? null, lastSets, best: record };
  }
  return history;
}
