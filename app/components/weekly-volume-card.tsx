import type { Entry, Workout } from "@/lib/types";

import { getWeeklyTrainingSummary } from "@/lib/workouts";

export function WeeklyVolumeCard({
  workouts,
  entries,
}: {
  workouts: Workout[];
  entries: Entry[];
}) {
  const summary = getWeeklyTrainingSummary(workouts, entries);
  const hasCardio = summary.cardio.totalDistanceKm > 0 || summary.cardio.totalDurationSec > 0;
  if (!hasCardio) return null;

  return (
    <section className="zet-weekly">
      <h2 className="zet-sectionTitle">Cardio denne uge</h2>
      <div className="zet-summaryGrid">
        {hasCardio && (
          <>
            <div className="zet-metric">
              <p className="zet-metricValue">{summary.cardio.totalDistanceKm.toLocaleString("da-DK")} <span>km</span></p>
              <p className="zet-weeklyLabel">cardiodistance</p>
            </div>
            <div className="zet-metric">
              <p className="zet-metricValue">{Math.round(summary.cardio.totalDurationSec / 60)} <span>min</span></p>
              <p className="zet-weeklyLabel">tid med cardio</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
