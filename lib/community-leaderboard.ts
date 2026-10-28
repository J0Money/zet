import type { CommunitySummary } from "./community-summary";
import type { Equipment } from "./types";
import { englishExerciseName, equipmentName } from "./exercise-names";

export type LeaderboardPost = { id: string; userId: string; name: string; image: string | null; summary: CommunitySummary };
export type LeaderboardResult = { userId: string; name: string; image: string | null; weightKg: number; reps: number; postId: string; date: string; rank: number };
export type LeaderboardExercise = { key: string; name: string; variants: { equipment: Equipment | "unspecified"; results: LeaderboardResult[] }[] };

export const BIG_FIVE = [
  { key: "squat", name: "Squat" },
  { key: "bench press", name: "Bench press" },
  { key: "deadlift", name: "Deadlift" },
  { key: "shoulder press", name: "Overhead press" },
  { key: "row", name: "Barbell row" },
] as const;

export function bigFiveLeaderboards(exercises: LeaderboardExercise[]) {
  return BIG_FIVE.map((exercise) => ({ ...exercise,
    results: exercises.find((item) => item.key === exercise.key)?.variants.find((variant) => variant.equipment === "barbell")?.results ?? [],
  }));
}

// Snapshots predate equipment metadata. Only explicit suffixes identify equipment;
// never infer a machine or bodyweight category from an exercise's name.
export function leaderboardExercise(name: string) {
  const translated = englishExerciseName(name).trim();
  for (const [equipment, label] of Object.entries(equipmentName)) {
    const suffix = ` (${label})`;
    if (translated.toLowerCase().endsWith(suffix.toLowerCase())) {
      let base = translated.slice(0, -suffix.length).trim();
      if (equipment === "barbell" && base.toLowerCase() === "overhead press") base = "Shoulder press";
      if (equipment === "barbell" && base.toLowerCase() === "barbell row") base = "Row";
      return { key: base.toLocaleLowerCase("en"), name: base, equipment: equipment as Equipment };
    }
  }
  return { key: translated.toLocaleLowerCase("en"), name: translated, equipment: "unspecified" as const };
}
const score = (a: { weightKg: number; reps: number }, b: { weightKg: number; reps: number }) => b.weightKg - a.weightKg || b.reps - a.reps;
export function buildLeaderboard(posts: LeaderboardPost[]): LeaderboardExercise[] {
  const groups = new Map<string, { name: string; variants: Map<Equipment | "unspecified", Map<string, LeaderboardResult>> }>();
  for (const post of posts) {
    for (const exercise of post.summary.exercises ?? []) {
      const choice = leaderboardExercise(exercise.name);
      if (!choice.key) continue;
      for (const set of exercise.sets) {
        if (set.kind !== "strength" || !Number.isFinite(set.weightKg) || set.weightKg < 0 || !Number.isInteger(set.reps) || set.reps < 1) continue;
        let group = groups.get(choice.key);
        if (!group) { group = { name: choice.name, variants: new Map() }; groups.set(choice.key, group); }
        let people = group.variants.get(choice.equipment);
        if (!people) { people = new Map(); group.variants.set(choice.equipment, people); }
        const result = { userId: post.userId, name: post.name, image: post.image, weightKg: set.weightKg, reps: set.reps, postId: post.id, date: post.summary.date, rank: 0 };
        const best = people.get(post.userId);
        if (!best || score(result, best) < 0 || (score(result, best) === 0 && `${result.date}:${result.postId}` < `${best.date}:${best.postId}`)) people.set(post.userId, result);
      }
    }
  }
  return [...groups].map(([key, group]) => ({ key, name: group.name, variants: [...group.variants].sort(([a], [b]) => a.localeCompare(b)).map(([equipment, people]) => {
    const ranked = [...people.values()].sort((a, b) => score(a, b) || a.name.localeCompare(b.name, "da") || a.userId.localeCompare(b.userId));
    ranked.forEach((result, index) => { result.rank = index > 0 && score(result, ranked[index - 1]) === 0 ? ranked[index - 1].rank : index + 1; });
    return { equipment, results: ranked.slice(0, 3) };
  }) })).sort((a, b) => a.name.localeCompare(b.name, "en"));
}
