import { requireUser } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatDateDanish } from "@/lib/dates";
import { formatCardio, formatPace } from "@/lib/format";
import type { Entry } from "@/lib/types";
import { getEntries, getExercises, getWorkoutById } from "@/lib/workout-store";

// Tillader at siden renderes fuldt ud pr. request ("blocking"), i stedet for
// at Next.js kræver en Suspense-grænse omkring den dynamiske del.
export const instant = false;

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Siden viser din egen data, den kan ikke forhåndsgenereres statisk.
  // connection() gør siden dynamisk pr. besøg.
  await connection();
  const currentUser = await requireUser();

  const { id } = await params;

  // getWorkoutById returnerer undefined både hvis id'et slet ikke findes, og
  // hvis workouten tilhører en anden bruger, begge tilfælde skal se ens ud
  // udefra (404), ellers kunne man gætte sig til at et id tilhører nogen.
  const workout = await getWorkoutById(currentUser.id, id);
  if (!workout) {
    notFound();
  }

  const entries = await getEntries(currentUser.id);
  const workoutEntries = entries.filter((entry) => entry.workout_id === workout.id);
  const exercises = await getExercises(currentUser.id);
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  const entriesByExercise = new Map<string, Entry[]>();
  for (const entry of workoutEntries) {
    const group = entriesByExercise.get(entry.exercise_id) ?? [];
    group.push(entry);
    entriesByExercise.set(entry.exercise_id, group);
  }

  return (
    <div className="zet-page flex flex-col gap-6">
      <div>
        <Link href="/history" className="text-sm text-zinc-500 hover:text-indigo-600">
          ← Tilbage til historik
        </Link>
      </div>

      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>{formatDateDanish(workout.date)}</h1>
        {workout.notes && (
          <p className="mt-2 text-sm text-zinc-500">{workout.notes}</p>
        )}
      </header>

      {entriesByExercise.size === 0 ? (
        <div className="zet-panel">
          <p className="text-sm text-zinc-500">Ingen sæt registreret for denne træning.</p>
        </div>
      ) : (
        <ul className="zet-panel divide-y divide-zinc-100">
          {[...entriesByExercise.entries()].map(([exerciseId, exerciseEntries]) => (
            <li key={exerciseId} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-zinc-900">
                {exerciseNameById.get(exerciseId) ?? "Ukendt øvelse"}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {exerciseEntries.map((entry, index) =>
                  entry.kind === "strength" ? (
                    <li key={entry.id} className="flex justify-between text-sm text-zinc-500">
                      <span>Sæt {index + 1}</span>
                      <span className="font-mono tabular-nums text-zinc-700">{entry.weight_kg} kg × {entry.reps}</span>
                    </li>
                  ) : (
                    <li key={entry.id} className="text-sm text-zinc-500">
                      {formatCardio(entry.distance_km, entry.duration_sec)}
                      {formatPace(entry.distance_km, entry.duration_sec) && (
                        <> · {formatPace(entry.distance_km, entry.duration_sec)}</>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
