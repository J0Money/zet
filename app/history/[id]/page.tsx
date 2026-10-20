import { requireUser } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatDateDanish } from "@/lib/dates";
import { formatCardio } from "@/lib/format";
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
    <div className="flex flex-col gap-4 p-4">
      <Link href="/history" className="text-sm text-zinc-500 dark:text-zinc-400">
        ← Tilbage til historik
      </Link>

      <h1 className="text-xl font-semibold">{formatDateDanish(workout.date)}</h1>

      {workout.notes && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{workout.notes}</p>
      )}

      {entriesByExercise.size === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ingen sæt registreret for denne træning.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {[...entriesByExercise.entries()].map(([exerciseId, exerciseEntries]) => (
            <li key={exerciseId}>
              <div className="font-medium">
                {exerciseNameById.get(exerciseId) ?? "Ukendt øvelse"}
              </div>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                {exerciseEntries.map((entry, index) =>
                  entry.kind === "strength" ? (
                    <li key={entry.id}>
                      Sæt {index + 1}: {entry.weight_kg} kg × {entry.reps}
                    </li>
                  ) : (
                    <li key={entry.id}>{formatCardio(entry.distance_km, entry.duration_sec)}</li>
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
