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
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">Vægt-progression</h2>

      <select
        value={exerciseId}
        onChange={(event) => setExerciseId(event.target.value)}
        className="mb-3 rounded border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
      >
        {strengthExercises.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name}
          </option>
        ))}
      </select>

      {progression.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ingen data for denne øvelse endnu.
        </p>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progression}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={50} unit=" kg" />
              <Tooltip />
              <Line type="monotone" dataKey="weightKg" stroke="#171717" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
