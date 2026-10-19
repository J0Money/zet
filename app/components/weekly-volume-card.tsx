import type { Entry, Workout } from "@/lib/types";
import { getWeeklyTrainingSummary } from "@/lib/workouts";

export function WeeklyVolumeCard({
  workouts,
  entries,
}: {
  workouts: Workout[];
  entries: Entry[];
}) {
  const summary = getWeeklyTrainingSummary(workouts, entries);
  const hasCardio = summary.cardio.totalDistanceKm > 0 || summary.cardio.totalDurationSec > 0;

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">Ugens træningsmængde</h2>
      <div className="flex flex-col gap-1 text-sm">
        <div>{summary.workoutCount} træninger denne uge</div>
        <div>{summary.totalVolumeKg} kg samlet volumen (styrke)</div>
        {hasCardio && (
          <div className="text-zinc-500 dark:text-zinc-400">
            Cardio: {summary.cardio.totalDistanceKm} km,{" "}
            {Math.round(summary.cardio.totalDurationSec / 60)} min
          </div>
        )}
      </div>
    </section>
  );
}
