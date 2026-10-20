import type { Entry, Exercise, Workout } from "@/lib/types";
import { getPersonalRecords } from "@/lib/workouts";
import { formatDateDanish } from "@/lib/dates";

export function PersonalRecordsCard({
  workouts,
  entries,
  exercises,
}: {
  workouts: Workout[];
  entries: Entry[];
  exercises: Exercise[];
}) {
  const records = getPersonalRecords(workouts, entries, exercises);

  return (
    <section className="zet-panel">
      <h2 className="mb-4 font-semibold">Personlige rekorder</h2>
      {records.length === 0 && <p className="text-sm text-zinc-500">Log dit første styrkesæt for at se dine rekorder her.</p>}
      <ul className="divide-y divide-zinc-100">
        {records.map((record) => (
          <li key={record.exerciseId} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{record.exerciseName}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDateDanish(record.date)}</p>
            </div>
            <span className="font-mono text-sm font-medium text-zinc-800 tabular-nums">
              {record.weightKg} kg × {record.reps}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
