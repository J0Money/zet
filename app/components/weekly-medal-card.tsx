import { formatShortDateDanish, formatWeekDanish, getTodayInCopenhagen, getISOWeek } from "@/lib/dates";
import type { Entry, Workout } from "@/lib/types";
import { getWeeklyMedal, getMedalCollection } from "@/lib/workouts";

import { WeightPlate, plateTypes } from "./weight-plate";
import { PlateCollection } from "./plate-collection";

export function WeeklyMedalCard({ workouts, entries }: { workouts: Workout[]; entries: Entry[] }) {
  const today = getTodayInCopenhagen();
  const { count, medal, next, days } = getWeeklyMedal(workouts, entries, today);
  const collection = getMedalCollection(workouts, entries, today);
  return <section className="zet-medal" aria-labelledby="weekly-medal-title">
    <div className="zet-medal-topline">
      <h2 id="weekly-medal-title">Ugens skive</h2>
      <span>{formatWeekDanish(days[0].date)}</span>
    </div>
    <div className="zet-medal-main">
      <div className={`zet-plates weekly-plate ${plateTypes[medal?.name ?? "Sølv"].className}`}><WeightPlate name={medal?.name} /></div>
      <div className="zet-medal-copy">
        <p className="zet-medal-name">{medal?.name ?? "Første skridt"}</p>
        <p className="zet-medal-progress">{next ? `${next.days - count} ${next.days - count === 1 ? "dag" : "dage"} til ${next.name}` : "Ugens højeste niveau"}</p>
      </div>
      <span className="zet-medal-count"><strong>{count}</strong> {count === 1 ? "træningsdag" : "træningsdage"}</span>
    </div>
    <ol className="zet-medal-days" aria-label="Ugens træningsdage">
      {days.map((day, index) => <li key={day.date} data-trained={day.trained}
        aria-label={`${formatShortDateDanish(day.date)}: ${day.trained ? "Træning gennemført" : "Ingen afsluttet træning"}`}>
        <span className="zet-medal-day" aria-hidden="true">{day.trained ? "✓" : ""}</span>
        <span>{["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"][index]}</span>
      </li>)}
    </ol>
    <details className="zet-medal-info">
      <summary aria-label="Sådan optjener du skiver"><span aria-hidden="true">i</span></summary>
      <p>Bronze: 2 dage · Sølv: 3 dage · Guld: 4 dage · Diamant: 5+ dage.</p>
      <p>Ugen går fra mandag til søndag. Højst ét afsluttet pas med sæt eller cardio pr. dag tæller.</p>
    </details>
    <div className="zet-medal-collection">
      <PlateCollection collection={collection} currentYear={getISOWeek(today).year} />
    </div>
  </section>;
}
