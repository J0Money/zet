import { requireUser } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CardioEntryRow } from "@/app/components/cardio-entry-row";
import { StrengthEntryRow } from "@/app/components/strength-entry-row";
import { formatDateDanish, formatTimeDanish } from "@/lib/dates";
import { formatWorkoutDuration } from "@/lib/format";
import type { Entry } from "@/lib/types";
import { getEntries, getExercises, getWorkoutById } from "@/lib/workout-store";
import { getSharePreview, getSharedPost } from "@/lib/community";
import { ShareWorkout } from "@/app/components/community-controls";

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
  const [sharePreview, sharedPost] = await Promise.all([
    getSharePreview(currentUser.id, id), getSharedPost(currentUser.id, id),
  ]);
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
        <Link href="/history" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-indigo-600">
          ← Tilbage til historik
        </Link>
      </div>

      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>{formatDateDanish(workout.date)}</h1>
        {workout.started_at && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {workout.ended_at
              ? `Kl. ${formatTimeDanish(workout.started_at)} til ${formatTimeDanish(workout.ended_at)} · ${formatWorkoutDuration(workout.started_at, workout.ended_at)}`
              : `Startet kl. ${formatTimeDanish(workout.started_at)} · i gang`}
          </p>
        )}
        {workout.notes && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{workout.notes}</p>
        )}
      </header>

      <ShareWorkout workoutId={id} name={currentUser.name} summary={sharePreview} shared={sharedPost} />

      {entriesByExercise.size === 0 ? (
        <div className="zet-panel">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen sæt registreret for denne træning.</p>
        </div>
      ) : (
        <ul className="zet-panel divide-y divide-zinc-100 dark:divide-zinc-800">
          {[...entriesByExercise.entries()].map(([exerciseId, exerciseEntries]) => (
            <li key={exerciseId} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {exerciseNameById.get(exerciseId) ?? "Ukendt øvelse"}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {exerciseEntries.map((entry, index) =>
                  entry.kind === "strength" ? (
                    <StrengthEntryRow key={entry.id} entry={entry} label={`Sæt ${index + 1}`} />
                  ) : (
                    <CardioEntryRow key={entry.id} entry={entry} />
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
