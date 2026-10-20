import type { Workout } from "@/lib/types";
import { getTrainingStreakWeeks } from "@/lib/workouts";

export function StreakCard({ workouts }: { workouts: Workout[] }) {
  const streakWeeks = getTrainingStreakWeeks(workouts);

  return (
    <section className="zet-streak" aria-label="Træningsstreak">
      <p><strong>{streakWeeks} {streakWeeks === 1 ? "uge" : "uger"}</strong> i træk med træning</p>
    </section>
  );
}
