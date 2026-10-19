"use client";

import { useActionState } from "react";
import { logStrengthSet, type LogStrengthSetState } from "@/app/log/actions";
import type { Exercise } from "@/lib/types";

const initialState: LogStrengthSetState = {};

export function StrengthSetForm({ exercises }: { exercises: Exercise[] }) {
  const [state, formAction, isPending] = useActionState(logStrengthSet, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Øvelse
        <select
          name="exerciseId"
          required
          className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        >
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Reps
        <input
          name="reps"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Vægt (kg)
        <input
          name="weightKg"
          type="number"
          inputMode="decimal"
          min={0.5}
          step={0.5}
          required
          className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground px-4 py-3 text-base font-medium text-background disabled:opacity-50"
      >
        {isPending ? "Gemmer…" : "Gem sæt"}
      </button>
    </form>
  );
}
