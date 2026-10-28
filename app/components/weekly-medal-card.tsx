import { formatWeekDanish, getTodayInCopenhagen, getISOWeek } from "@/lib/dates";
import type { Entry, Workout } from "@/lib/types";
import { getWeeklyMedal, getMedalCollection } from "@/lib/workouts";

import { WeightPlate, plateTypes } from "./weight-plate";
import { StreakCard } from "./streak-card";
import { PlateCollection } from "./plate-collection";

export function WeeklyMedalCard({ workouts, entries }: { workouts: Workout[]; entries: Entry[] }) {
  const today = getTodayInCopenhagen();
  const { count, medal, next, days } = getWeeklyMedal(workouts, entries, today);
  const collection = getMedalCollection(workouts, entries, today);
  return <section className="zet-medal" aria-labelledby="weekly-medal-title">
    <div className="zet-medal-topline">
      <h2 id="weekly-medal-title">Denne uge</h2>
      <span>{formatWeekDanish(days[0].date)}</span>
    </div>
    <div className="zet-medal-main">
      <div className={`zet-plates weekly-plate ${plateTypes[medal?.name ?? "Sølv"].className}`}><WeightPlate name={medal?.name} /></div>
      <div className="zet-medal-copy">
        <p className="zet-medal-name">{medal?.name ?? "På vej"}</p>
        <div className="zet-weekly-track" role="progressbar" aria-label="Fremgang mod Diamant"
          aria-valuemin={0} aria-valuemax={5} aria-valuenow={Math.min(count, 5)}
          aria-valuetext={`${count} træningsdage, ${medal?.name ?? "på vej mod Bronze"}`}>
          {Array.from({ length: 5 }, (_, index) => <span key={index} data-filled={index < count} />)}
        </div>
        <p className="zet-medal-progress">{count} {count === 1 ? "træningsdag" : "træningsdage"} · {next ? `${next.days - count} til ${next.name}` : "Diamant nået"}</p>
      </div>
    </div>
    <details className="zet-medal-info">
      <summary aria-label="Sådan optjener du skiver"><span aria-hidden="true">i</span></summary>
      <p>Bronze: 2 dage · Sølv: 3 dage · Guld: 4 dage · Diamant: 5+ dage.</p>
      <p>Ugen går fra mandag til søndag. Højst ét afsluttet pas med sæt eller cardio pr. dag tæller.</p>
    </details>
    <StreakCard workouts={workouts} />
    <div className="zet-medal-collection">
      <PlateCollection collection={collection} currentYear={getISOWeek(today).year} />
    </div>
  </section>;
}
