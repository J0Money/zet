import { formatDateDanish } from "@/lib/dates";
import type { Entry, Exercise, Workout } from "@/lib/types";
import { getLatestWorkouts } from "@/lib/workouts";

export function LatestWorkoutsCard({
  workouts,
  entries,
  exercises,
}: {
  workouts: Workout[];
  entries: Entry[];
  exercises: Exercise[];
}) {
  const latestWorkouts = getLatestWorkouts(workouts, entries, exercises);

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">Seneste træninger</h2>
      <ul className="flex flex-col gap-3">
        {latestWorkouts.map(({ workout, exerciseNames }) => (
          <li key={workout.id} className="text-sm">
            <div className="font-medium">{formatDateDanish(workout.date)}</div>
            <div className="text-zinc-500 dark:text-zinc-400">
              {exerciseNames.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
