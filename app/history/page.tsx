import { requireUser } from "@/lib/session";
import Link from "next/link";
import { connection } from "next/server";
import { formatDateDanish } from "@/lib/dates";
import { getLatestWorkouts } from "@/lib/workouts";
import { getEntries, getExercises, getWorkouts } from "@/lib/workout-store";

// Tillader at siden renderes fuldt ud pr. request ("blocking"), i stedet for
// at Next.js kræver en Suspense-grænse omkring den dynamiske del.
export const instant = false;

export default async function HistoryPage() {
  // Historikken viser din egen data, den kan ikke forhåndsgenereres statisk.
  // connection() gør siden dynamisk pr. besøg.
  await connection();
  const currentUser = await requireUser();

  const workouts = await getWorkouts(currentUser.id);
  const entries = await getEntries(currentUser.id);
  const exercises = await getExercises(currentUser.id);
  const workoutSummaries = getLatestWorkouts(workouts, entries, exercises, workouts.length);

  return (
    <div className="zet-page flex flex-col gap-6">
      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>Historik</h1>
      </header>

      {workoutSummaries.length === 0 ? (
        <div className="zet-panel">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen træninger logget endnu.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {workoutSummaries.map(({ workout, exerciseNames, strengthSetCount, cardioCount }) => {
            const countParts = [
              strengthSetCount > 0 ? `${strengthSetCount} sæt` : null,
              cardioCount > 0 ? `${cardioCount} cardio` : null,
            ].filter(Boolean);

            return (
              <li key={workout.id}>
                <Link
                  href={`/history/${workout.id}`}
                  className="group zet-panel block transition-colors hover:border-indigo-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600">
                      {formatDateDanish(workout.date)}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">{countParts.join(" · ")}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {exerciseNames.map((name) => (
                      <span key={name} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {name}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
