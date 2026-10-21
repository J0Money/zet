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
          <p className="text-sm text-zinc-500">Ingen træninger logget endnu.</p>
        </div>
      ) : (
        <ul className="zet-panel divide-y divide-zinc-100">
          {workoutSummaries.map(({ workout, exerciseNames, strengthSetCount, cardioCount }) => {
            const countParts = [
              strengthSetCount > 0 ? `${strengthSetCount} sæt` : null,
              cardioCount > 0 ? `${cardioCount} cardio` : null,
            ].filter(Boolean);

            return (
              <li key={workout.id}>
                <Link
                  href={`/history/${workout.id}`}
                  className="group flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 group-hover:text-indigo-600">
                      {formatDateDanish(workout.date)}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {exerciseNames.join(", ")} · {countParts.join(", ")}
                    </p>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-zinc-400 group-hover:text-indigo-600">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
