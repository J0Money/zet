import type { CommunitySummary } from "@/lib/community-summary";
import { formatDateDanish } from "@/lib/dates";
import { formatCardio, formatSetsSummary } from "@/lib/format";

export function CommunitySummaryCard({ summary }: { summary: CommunitySummary }) {
  return <div className="space-y-3">
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDateDanish(summary.date)}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {summary.duration && <span>{summary.duration}</span>}
      <span>{summary.strengthSets} styrkesæt</span>
      {summary.cardioSessions > 0 && <span>{summary.cardioSessions} cardioaktiviteter</span>}
    </div>
    {summary.records.length > 0 && <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950 p-3">
      <p className="mb-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">Nye personlige rekorder</p>
      <ul className="space-y-3">{summary.records.map((record, index) => <li key={index} className="text-sm">
        <p className="font-medium">{record.exercise}</p>
        <p>{formatSetsSummary([{ weight_kg: record.weightKg, reps: record.reps }])}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Tidligere: {formatSetsSummary([{ weight_kg: record.previousWeightKg, reps: record.previousReps }])}</p>
      </li>)}</ul>
    </div>}
    {summary.exercises && <details className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Vis træningen ({summary.exercises.length} øvelser)</summary>
      <ul className="space-y-4 pt-3">{summary.exercises.map((exercise, index) => <li key={index}>
        <p className="break-words text-sm font-semibold">{exercise.name}</p>
        <ol className="mt-1 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">{exercise.sets.map((set, setIndex) => <li key={setIndex}>
          {set.kind === "strength" ? `Sæt ${setIndex + 1}: ${formatSetsSummary([{ weight_kg: set.weightKg, reps: set.reps }])}` : formatCardio(set.distanceKm, set.durationSec)}
        </li>)}</ol>
      </li>)}</ul>
    </details>}
  </div>;
}
