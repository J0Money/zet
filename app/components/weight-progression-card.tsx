"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Entry, Exercise, Workout } from "@/lib/types";
import { getWeightProgression } from "@/lib/workouts";

export function WeightProgressionCard({
  workouts,
  entries,
  exercises,
}: {
  workouts: Workout[];
  entries: Entry[];
  exercises: Exercise[];
}) {
  const strengthExercises = exercises.filter((exercise) => exercise.type === "strength");
  const [exerciseId, setExerciseId] = useState(strengthExercises[0]?.id ?? "");
  const progression = getWeightProgression(workouts, entries, exerciseId);

  return (
    <section className="zet-panel">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Vægtprogression</h2>
        <p className="mt-1 text-sm text-zinc-500">Vægt pr. træning for din valgte øvelse.</p>
      </div>
      <select
        aria-label="Vælg øvelse til vægtprogression"
        value={exerciseId}
        disabled={strengthExercises.length === 0}
        onChange={(event) => setExerciseId(event.target.value)}
        className="min-h-11 max-w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
      >
        {strengthExercises.length === 0 && <option value="">Ingen styrkeøvelser</option>}
        {strengthExercises.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name}
          </option>
        ))}
      </select>
      </div>

      {progression.length === 0 ? (
        <p className="rounded-xl bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">
          Ingen data for denne øvelse endnu.
        </p>
      ) : (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progression}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#71717a" }} tickLine={false} axisLine={false} minTickGap={32} tickMargin={12} />
              <YAxis tick={{ fontSize: 12, fill: "#71717a" }} tickLine={false} axisLine={false} width={55} unit=" kg" />
              <Tooltip contentStyle={{ borderRadius: 4, borderColor: "#e4e4e7" }} />
              <Line type="monotone" dataKey="weightKg" name="Vægt" unit=" kg" stroke="var(--color-indigo-600)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
