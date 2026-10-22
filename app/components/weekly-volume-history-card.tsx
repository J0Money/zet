"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDateDanish } from "@/lib/dates";
import type { Entry, Workout } from "@/lib/types";
import { getWeeklyVolumeHistory } from "@/lib/workouts";

export function WeeklyVolumeHistoryCard({
  workouts,
  entries,
}: {
  workouts: Workout[];
  entries: Entry[];
}) {
  const history = getWeeklyVolumeHistory(workouts, entries, 8);
  const hasAnyVolume = history.some((point) => point.totalVolumeKg > 0);
  const chartData = history.map((point) => ({
    ...point,
    label: formatShortDateDanish(point.weekStart),
  }));

  return (
    <section className="zet-panel">
      <h2 className="text-base font-semibold tracking-tight">Styrkevolumen pr. uge</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Samlet volumen de seneste 8 uger, så du kan se udviklingen, ikke kun denne uge.</p>

      {!hasAnyVolume ? (
        <p className="mt-6 rounded-xl bg-zinc-50 dark:bg-zinc-800 px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Ingen styrkesæt logget endnu.
        </p>
      ) : (
        <div className="mt-6 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--zet-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--zet-muted)" }} tickLine={false} axisLine={false} tickMargin={12} />
              <YAxis tick={{ fontSize: 12, fill: "var(--zet-muted)" }} tickLine={false} axisLine={false} width={55} unit=" kg" />
              <Tooltip contentStyle={{ borderRadius: 4, borderColor: "var(--zet-border)", background: "var(--zet-panel-bg)", color: "var(--foreground)" }} />
              <Bar dataKey="totalVolumeKg" name="Volumen" unit=" kg" fill="var(--color-indigo-600)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
