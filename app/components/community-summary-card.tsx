import type { CommunitySummary } from "@/lib/community-summary";
import { formatDateDanish } from "@/lib/dates";
import { formatCardio, formatSetsSummary } from "@/lib/format";
import { displayExerciseName } from "@/lib/exercise-names";

export function CommunitySummaryCard({ summary, compact = false }: { summary: CommunitySummary; compact?: boolean }) {
  const records = summary.records.length > 0 && <div className={compact ? "space-y-3 py-3" : "rounded-xl bg-indigo-50 dark:bg-indigo-950 p-3"}>
    <p className="mb-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{summary.records.length === 1 ? "Ny personlig rekord" : "Nye personlige rekorder"}</p>
    <ul className="space-y-3">{summary.records.map((record, index) => <li key={index} className="text-sm">
      <p className="font-medium">{displayExerciseName(record.exercise)}</p>
      <p>{formatSetsSummary([{ weight_kg: record.weightKg, reps: record.reps }])}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Tidligere: {formatSetsSummary([{ weight_kg: record.previousWeightKg, reps: record.previousReps }])}</p>
    </li>)}</ul>
  </div>;
  return <div className="space-y-3">
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDateDanish(summary.date)}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {summary.exercises && <span>{summary.exercises.length} øvelser</span>}
      {summary.strengthSets > 0 && <span>{summary.strengthSets} {compact ? "sæt" : "styrkesæt"}</span>}
      {summary.cardioSessions > 0 && <span>{summary.cardioSessions} cardioaktiviteter</span>}
      {summary.duration && <span>{summary.duration}</span>}
    </div>
    {!compact && records}
    {compact && summary.records.length > 0 && <p className="community-record-hint"><span aria-hidden="true">🏆</span> {summary.records.length} {summary.records.length === 1 ? "ny rekord" : "nye rekorder"}</p>}
    {(summary.exercises || (compact && summary.records.length > 0)) && <details className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">{compact ? (summary.exercises ? "Se træningen" : "Se rekorder") : `Vis træningen (${summary.exercises?.length} øvelser)`}</summary>
      {compact && records}
      {summary.exercises && <ul className="space-y-4 pt-3">{summary.exercises.map((exercise, index) => <li key={index}>
        <p className="break-words text-sm font-semibold">{displayExerciseName(exercise.name)}</p>
        <ol className="mt-1 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">{exercise.sets.map((set, setIndex) => <li key={setIndex}>
          {set.kind === "strength" ? `Sæt ${setIndex + 1}: ${formatSetsSummary([{ weight_kg: set.weightKg, reps: set.reps }])}` : formatCardio(set.distanceKm, set.durationSec)}
        </li>)}</ol>
      </li>)}</ul>}
    </details>}
  </div>;
}
