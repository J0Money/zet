import { requireUser } from "@/lib/session";
import { connection } from "next/server";
import Link from "next/link";
import "./dashboard.css";
import "./plates.css";
import { LatestWorkoutsCard } from "@/app/components/latest-workouts-card";
import { PersonalRecordsCard } from "@/app/components/personal-records-card";

import { WeeklyMedalCard } from "@/app/components/weekly-medal-card";
import { WeeklyVolumeCard } from "@/app/components/weekly-volume-card";
import { WeeklyVolumeHistoryCard } from "@/app/components/weekly-volume-history-card";
import { WeightProgressionCard } from "@/app/components/weight-progression-card";
import { getEntries, getExercises, getWorkouts } from "@/lib/workout-store";

// Tillader at siden renderes fuldt ud pr. request ("blocking"), i stedet for
// at Next.js kræver en Suspense-grænse omkring den dynamiske del.
export const instant = false;

export default async function DashboardPage() {
  // Dashboardet viser "i dag" og din egen data, det kan ikke forhåndsgenereres
  // statisk. connection() fortæller Next.js at siden skal renderes for hvert
  // rigtigt besøg.
  await connection();
  const currentUser = await requireUser();

  // Kortene modtager kun data, som tilhører den aktuelle sessions bruger.
  const workouts = await getWorkouts(currentUser.id);
  const entries = await getEntries(currentUser.id);
  const exercises = await getExercises(currentUser.id);

  return (
    <div className="zet-page zet-dashboard">
      <header className="zet-header">
        <div className="zet-masthead">
          <div><p className="zet-brand">ZET</p><h1>Overblik</h1></div>
          <Link href="/log" className="zet-headerAction"><span aria-hidden="true">+</span> Log træning</Link>
        </div>

      </header>
      <div className="zet-content">
        <WeeklyMedalCard workouts={workouts} entries={entries} />
        <section className="zet-development" aria-labelledby="development-title">
          <h2 id="development-title">Din udvikling</h2>
          <div className="zet-chart-grid">
            <WeeklyVolumeHistoryCard workouts={workouts} entries={entries} />
            <WeightProgressionCard workouts={workouts} entries={entries} exercises={exercises} />
          </div>
          <WeeklyVolumeCard workouts={workouts} entries={entries} />
        </section>
        <div className="zet-details">
          <LatestWorkoutsCard workouts={workouts} entries={entries} exercises={exercises} />
          <PersonalRecordsCard workouts={workouts} entries={entries} exercises={exercises} />
        </div>
      </div>
    </div>
  );
}
