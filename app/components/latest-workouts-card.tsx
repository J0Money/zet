import { formatDateDanish } from "@/lib/dates";
import type { Entry, Exercise, Workout } from "@/lib/types";
import { getLatestWorkouts } from "@/lib/workouts";
import Link from "next/link";

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
    <section className="zet-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Seneste træninger</h2>
        <Link href="/history" className="py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">Se alle <span aria-hidden="true">→</span></Link>
      </div>
      {latestWorkouts.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">Dine træninger dukker op her, når du logger dem.</p>}
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {latestWorkouts.map(({ workout, exerciseNames }) => (
          <li key={workout.id} className="text-sm">
            <Link href={`/history/${workout.id}`} className="group flex items-center justify-between gap-3 rounded-lg py-4">
              <div>
                <div className="font-medium group-hover:text-indigo-600">{formatDateDanish(workout.date)}</div>
                <div className="mt-1 text-zinc-500 dark:text-zinc-400">{exerciseNames.join(", ") || "Ingen øvelser registreret"}</div>
              </div>
              <span aria-hidden="true" className="text-zinc-400 group-hover:text-indigo-600">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
