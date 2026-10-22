import { requireUser } from "@/lib/session";
import { connection } from "next/server";
import Link from "next/link";
import { CardioEntryRow } from "@/app/components/cardio-entry-row";
import { LogFormTabs } from "@/app/components/log-form-tabs";
import { StrengthEntryRow } from "@/app/components/strength-entry-row";
import { getTodayInCopenhagen } from "@/lib/dates";
import { getPrograms } from "@/lib/programs";
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
  const programs = await getPrograms(currentUser.id);

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

      <Link href="/programs" className="self-start text-sm text-indigo-600 hover:text-indigo-800">
        Administrer programmer →
      </Link>

      <LogFormTabs
        strengthExercises={strengthExercises}
        cardioExercises={cardioExercises}
        programs={programs}
      />

      <section className="zet-panel">
        <h2 className="zet-sectionTitle mb-4">Dagens sæt</h2>
        {groupedEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen sæt logget i dag endnu.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {groupedEntries.map((group) => (
              <li key={group.exerciseId} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{group.exerciseName}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {group.entries.map((entry, index) =>
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
      </section>
    </div>
  );
}
