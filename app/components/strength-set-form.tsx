"use client";

import { useActionState, useMemo, useState } from "react";
import { logStrengthSet, type LogStrengthSetState } from "@/app/log/actions";
import { MUSCLE_GROUPS, muscleGroupLabel } from "@/lib/muscle-groups";
import type { Exercise, MuscleGroup } from "@/lib/types";

const initialState: LogStrengthSetState = {};

export function StrengthSetForm({ exercises }: { exercises: Exercise[] }) {
  const [state, formAction, isPending] = useActionState(logStrengthSet, initialState);
  const [selectedTags, setSelectedTags] = useState<Set<MuscleGroup>>(new Set());

  // Kun tags, der rent faktisk findes på en af øvelserne, vises som knapper.
  const availableTags = useMemo(
    () => MUSCLE_GROUPS.filter((group) => exercises.some((exercise) => exercise.muscle_groups.includes(group))),
    [exercises],
  );
  // Flere valgte tags virker som "eller": en øvelse vises, hvis den matcher
  // mindst ét af dem, fx "Ryg" + "Biceps" viser øvelser med enten tag.
  const filteredExercises = selectedTags.size === 0
    ? exercises
    : exercises.filter((exercise) => exercise.muscle_groups.some((group) => selectedTags.has(group)));

  function toggleTag(group: MuscleGroup) {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {availableTags.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          Filtrér på muskelgruppe
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTags(new Set())}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                selectedTags.size === 0
                  ? "bg-foreground text-background"
                  : "border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              Alle
            </button>
            {availableTags.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => toggleTag(group)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  selectedTags.has(group)
                    ? "bg-foreground text-background"
                    : "border border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {muscleGroupLabel[group]}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Øvelse
        <select
          name="exerciseId"
          required
          className="rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700"
        >
          {filteredExercises.map((exercise) => (
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
