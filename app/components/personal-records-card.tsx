import type { Entry, Exercise, Workout } from "@/lib/types";
import { getPersonalRecords } from "@/lib/workouts";

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
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">Personlige rekorder</h2>
      <ul className="flex flex-col gap-2">
        {records.map((record) => (
          <li key={record.exerciseId} className="flex justify-between text-sm">
            <span>{record.exerciseName}</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {record.weightKg} kg × {record.reps} ({record.date})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
