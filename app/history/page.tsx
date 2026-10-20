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
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Historik</h1>

      {workoutSummaries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ingen træninger logget endnu.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workoutSummaries.map(({ workout, exerciseNames, strengthSetCount, cardioCount }) => {
            const countParts = [
              strengthSetCount > 0 ? `${strengthSetCount} sæt` : null,
              cardioCount > 0 ? `${cardioCount} cardio` : null,
            ].filter(Boolean);

            return (
              <li key={workout.id}>
                <Link
                  href={`/history/${workout.id}`}
                  className="block rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
                >
                  <div className="font-medium">{formatDateDanish(workout.date)}</div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {exerciseNames.join(", ")} · {countParts.join(", ")}
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
