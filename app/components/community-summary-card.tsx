import type { CommunitySummary } from "@/lib/community-summary";
import { formatDateDanish } from "@/lib/dates";
import { formatSetsSummary } from "@/lib/format";

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
  </div>;
}
