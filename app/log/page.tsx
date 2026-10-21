import { requireUser } from "@/lib/session";
import { connection } from "next/server";
import { LogFormTabs } from "@/app/components/log-form-tabs";
import { getTodayInCopenhagen } from "@/lib/dates";
import { formatCardio, formatPace } from "@/lib/format";
import type { Entry } from "@/lib/types";
import { getEntries, getExercises, getWorkouts } from "@/lib/workout-store";

// Tillader at siden renderes fuldt ud pr. request ("blocking"), i stedet for
// at Next.js kræver en Suspense-grænse omkring den dynamiske del.
export const instant = false;

export default async function LogPage() {
  // Siden viser "i dag" og dine egne loggede sæt, det kan ikke
  // forhåndsgenereres statisk. connection() gør siden dynamisk pr. besøg.
  await connection();
  const currentUser = await requireUser();

  const exercises = await getExercises(currentUser.id);
  const strengthExercises = exercises.filter((exercise) => exercise.type === "strength");
  const cardioExercises = exercises.filter((exercise) => exercise.type === "cardio");
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  const today = getTodayInCopenhagen();
  const workouts = await getWorkouts(currentUser.id);
  const todaysWorkout = workouts.find((workout) => workout.date === today);
  const todaysEntries = todaysWorkout
    ? (await getEntries(currentUser.id)).filter(
        (entry) => entry.workout_id === todaysWorkout.id,
      )
    : [];

  // Grupperer dagens sæt pr. øvelse (fx "Bænkpres" med sæt 1, 2, 3 under sig),
  // i stedet for én flad linje pr. sæt. Rækkefølgen følger, hvornår hver
  // øvelse først blev logget i dag.
  const groupedEntries: { exerciseId: string; exerciseName: string; entries: Entry[] }[] = [];
  const groupIndexByExerciseId = new Map<string, number>();
  for (const entry of todaysEntries) {
    let index = groupIndexByExerciseId.get(entry.exercise_id);
    if (index === undefined) {
      index = groupedEntries.length;
      groupIndexByExerciseId.set(entry.exercise_id, index);
      groupedEntries.push({
        exerciseId: entry.exercise_id,
        exerciseName: exerciseNameById.get(entry.exercise_id) ?? "Ukendt øvelse",
        entries: [],
      });
    }
    groupedEntries[index].entries.push(entry);
  }

  return (
    <div className="zet-page flex flex-col gap-6">
      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>Log en træning</h1>
      </header>

      <LogFormTabs
        strengthExercises={strengthExercises}
        cardioExercises={cardioExercises}
      />

      <section className="zet-panel">
        <h2 className="zet-sectionTitle mb-4">Dagens sæt</h2>
        {groupedEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">Ingen sæt logget i dag endnu.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {groupedEntries.map((group) => (
              <li key={group.exerciseId} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-zinc-900">{group.exerciseName}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {group.entries.map((entry, index) => (
                    <li key={entry.id} className="flex justify-between text-sm text-zinc-500">
                      {entry.kind === "strength" ? (
                        <>
                          <span>Sæt {index + 1}</span>
                          <span className="font-mono tabular-nums text-zinc-700">{entry.weight_kg} kg × {entry.reps}</span>
                        </>
                      ) : (
                        <span>
                          {formatCardio(entry.distance_km, entry.duration_sec)}
                          {formatPace(entry.distance_km, entry.duration_sec) && (
                            <> · {formatPace(entry.distance_km, entry.duration_sec)}</>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
