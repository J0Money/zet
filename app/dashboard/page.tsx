import { connection } from "next/server";
import { LatestWorkoutsCard } from "@/app/components/latest-workouts-card";
import { PersonalRecordsCard } from "@/app/components/personal-records-card";
import { StreakCard } from "@/app/components/streak-card";
import { WeeklyVolumeCard } from "@/app/components/weekly-volume-card";
import { WeightProgressionCard } from "@/app/components/weight-progression-card";
import { CURRENT_USER_ID, getEntries, getExercises, getWorkouts } from "@/lib/workout-store";

// Tillader at siden renderes fuldt ud pr. request ("blocking"), i stedet for
// at Next.js kræver en Suspense-grænse omkring den dynamiske del.
export const instant = false;

export default async function DashboardPage() {
  // Dashboardet viser "i dag" og din egen data, det kan ikke forhåndsgenereres
  // statisk. connection() fortæller Next.js at siden skal renderes for hvert
  // rigtigt besøg.
  await connection();

  // Data hentes her, ét sted, og sendes videre som props. Kortene selv kender
  // intet til workout-store eller CURRENT_USER_ID, de modtager bare færdige
  // lister og regner på dem. Det betyder at når trin 6 gør getWorkouts/
  // getEntries asynkrone (rigtige databaseopslag), er det kun denne side der
  // skal rettes, ikke de fem kort.
  const workouts = await getWorkouts(CURRENT_USER_ID);
  const entries = await getEntries(CURRENT_USER_ID);
  const exercises = await getExercises(CURRENT_USER_ID);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <StreakCard workouts={workouts} />
      <WeeklyVolumeCard workouts={workouts} entries={entries} />
      <WeightProgressionCard workouts={workouts} entries={entries} exercises={exercises} />
      <PersonalRecordsCard workouts={workouts} entries={entries} exercises={exercises} />
      <LatestWorkoutsCard workouts={workouts} entries={entries} exercises={exercises} />
    </div>
  );
}
