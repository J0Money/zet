import { requireUser } from "@/lib/session";
import { connection } from "next/server";
import { LogFormTabs } from "@/app/components/log-form-tabs";
import { getTodayInCopenhagen } from "@/lib/dates";
import { formatCardio } from "@/lib/format";
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Log en træning</h1>

      <LogFormTabs
        strengthExercises={strengthExercises}
        cardioExercises={cardioExercises}
      />

      <section>
        <h2 className="mb-2 font-semibold">Dagens sæt</h2>
        {todaysEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ingen sæt logget i dag endnu.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaysEntries.map((entry) => (
              <li key={entry.id} className="flex justify-between text-sm">
                <span>{exerciseNameById.get(entry.exercise_id) ?? "Ukendt øvelse"}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {entry.kind === "strength"
                    ? `${entry.weight_kg} kg × ${entry.reps}`
                    : formatCardio(entry.distance_km, entry.duration_sec)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
