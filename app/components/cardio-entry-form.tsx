"use client";

import { useActionState } from "react";
import { logCardioEntry, type LogCardioEntryState } from "@/app/log/actions";
import type { Exercise } from "@/lib/types";

const initialState: LogCardioEntryState = {};

export function CardioEntryForm({ exercises }: { exercises: Exercise[] }) {
  const [state, formAction, isPending] = useActionState(logCardioEntry, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Øvelse
        <select
          name="exerciseId"
          required
          defaultValue={state.values?.exerciseId}
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
        Distance (km)
        <input
          name="distanceKm"
          type="number"
          inputMode="decimal"
          min={0.1}
          step={0.1}
          required
          defaultValue={state.values?.distanceKm}
          className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Minutter
          <input
            name="minutes"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            defaultValue={state.values?.minutes}
            className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          Sekunder
          <input
            name="seconds"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={1}
            required
            defaultValue={state.values?.seconds ?? "0"}
            className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
          />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground px-4 py-3 text-base font-medium text-background disabled:opacity-50"
      >
        {isPending ? "Gemmer…" : "Gem cardio"}
      </button>
    </form>
  );
}
