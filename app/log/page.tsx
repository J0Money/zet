import { requireUser } from "@/lib/session";
import { connection } from "next/server";
import Link from "next/link";
import { CardioEntryRow } from "@/app/components/cardio-entry-row";
import { LogFormTabs } from "@/app/components/log-form-tabs";
import { SessionBar } from "@/app/components/session-bar";
import { StrengthEntryRow } from "@/app/components/strength-entry-row";
import { getPrograms } from "@/lib/programs";
import type { Entry } from "@/lib/types";
import { getActiveWorkout, getEntries, getExercises, getWorkouts } from "@/lib/workout-store";
import { getExerciseHistory } from "@/lib/workouts";
import { getExerciseNotes } from "@/lib/exercise-notes";
import { lastEquipmentByChoice } from "@/lib/exercise-groups";

// Tillader at siden renderes fuldt ud pr. request ("blocking"), i stedet for
// at Next.js kræver en Suspense-grænse omkring den dynamiske del.
export const instant = false;

export default async function LogPage() {
  // Siden viser dit aktive pas og dine egne loggede sæt, det kan ikke
  // forhåndsgenereres statisk. connection() gør siden dynamisk pr. besøg.
  await connection();
  const currentUser = await requireUser();
  const exerciseNotes = await getExerciseNotes(currentUser.id);

  const exercises = await getExercises(currentUser.id);
  const strengthExercises = exercises.filter((exercise) => exercise.type === "strength");
  const cardioExercises = exercises.filter((exercise) => exercise.type === "cardio");
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const programs = await getPrograms(currentUser.id);

  const activeWorkout = await getActiveWorkout(currentUser.id);
  const entries = await getEntries(currentUser.id);
  const workouts = await getWorkouts(currentUser.id);
  const exerciseHistory = getExerciseHistory(workouts, entries, activeWorkout?.id);
  const sessionEntries = activeWorkout
    ? entries.filter(
        (entry) => entry.workout_id === activeWorkout.id,
      )
    : [];

  // Grupperer passets sæt pr. øvelse (fx "Bænkpres" med sæt 1, 2, 3 under sig),
  // i stedet for én flad linje pr. sæt. Det senest loggede står øverst: den
  // øvelse, man sidst loggede på, står først, og inden for en øvelse står det
  // nyeste sæt først, så man lige under formularen ser, hvad man var på. Sættene
  // beholder deres nummer ("Sæt 3" er stadig det tredje, man loggede).
  // sessionEntries er sorteret efter, hvornår de blev logget (ældst først).
  const groupedEntries: {
    exerciseId: string;
    exerciseName: string;
    entries: { entry: Entry; number: number }[];
    lastLoggedIndex: number;
  }[] = [];
  const groupIndexByExerciseId = new Map<string, number>();
  sessionEntries.forEach((entry, position) => {
    let index = groupIndexByExerciseId.get(entry.exercise_id);
    if (index === undefined) {
      index = groupedEntries.length;
      groupIndexByExerciseId.set(entry.exercise_id, index);
      groupedEntries.push({
        exerciseId: entry.exercise_id,
        exerciseName: exerciseNameById.get(entry.exercise_id) ?? "Ukendt øvelse",
        entries: [],
        lastLoggedIndex: position,
      });
    }
    const group = groupedEntries[index];
    group.entries.push({ entry, number: group.entries.length + 1 });
    group.lastLoggedIndex = position;
  });
  groupedEntries.sort((a, b) => b.lastLoggedIndex - a.lastLoggedIndex);
  for (const group of groupedEntries) group.entries.reverse();

  return (
    <div className="zet-page flex flex-col gap-6">
      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>Log en træning</h1>
      </header>

      <Link href="/programs" className="self-start text-sm text-indigo-600 hover:text-indigo-800">
        Administrer programmer →
      </Link>

      <SessionBar startedAt={activeWorkout?.started_at ?? null} />

      <LogFormTabs
        key={currentUser.id}
        userId={currentUser.id}
        strengthExercises={strengthExercises}
        cardioExercises={cardioExercises}
        programs={programs}
        exerciseHistory={exerciseHistory}
        exerciseNotes={exerciseNotes}
        preferredEquipment={lastEquipmentByChoice(strengthExercises, entries)}
      />

      <section className="zet-panel">
        <h2 className="zet-sectionTitle mb-4">{activeWorkout ? "Sæt i dette pas" : "Sæt"}</h2>
        {groupedEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeWorkout ? "Ingen sæt logget i dette pas endnu." : "Ingen træning i gang."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {groupedEntries.map((group) => (
              <li key={group.exerciseId} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{group.exerciseName}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {group.entries.map(({ entry, number }) =>
                    entry.kind === "strength" ? (
                      <StrengthEntryRow key={entry.id} entry={entry} label={`Sæt ${number}`} />
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
