import type { Workout } from "@/lib/types";
import { getTrainingStreakWeeks } from "@/lib/workouts";

export function StreakCard({ workouts }: { workouts: Workout[] }) {
  const streakWeeks = getTrainingStreakWeeks(workouts);

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">Streak</h2>
      <div className="text-sm">
        {streakWeeks} {streakWeeks === 1 ? "uge" : "uger"} i træk med træning
      </div>
    </section>
  );
}
