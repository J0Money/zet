import { requireUser } from "@/lib/session";
import { connection } from "next/server";
import { HistoryView } from "@/app/components/history-view";
import { getTodayInCopenhagen } from "@/lib/dates";
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

      <HistoryView workoutSummaries={workoutSummaries} today={getTodayInCopenhagen()} />
    </div>
  );
}
