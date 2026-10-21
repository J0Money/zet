"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { logStrengthSet, type LogStrengthSetState } from "@/app/log/actions";
import { MUSCLE_GROUPS, muscleGroupLabel } from "@/lib/muscle-groups";
import type { Exercise, MuscleGroup } from "@/lib/types";

const initialState: LogStrengthSetState = {};
const inputClass = "rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700";

type SetRow = { id: number; reps: string; weightKg: string };

function emptySet(id: number): SetRow {
  return { id, reps: "", weightKg: "" };
}

export function StrengthSetForm({ exercises }: { exercises: Exercise[] }) {
  const [state, formAction, isPending] = useActionState(logStrengthSet, initialState);
  const [selectedTags, setSelectedTags] = useState<Set<MuscleGroup>>(new Set());
  const nextId = useRef(1);
  const [sets, setSets] = useState<SetRow[]>(() => [emptySet(0)]);

  // Efter et vellykket gem starter listen af sæt forfra, klar til næste øvelse.
  useEffect(() => {
    if (state.success) setSets([emptySet(nextId.current++)]);
  }, [state]);

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

  function addSet() {
    // Nye sæt arver reps/vægt fra det forrige, de fleste sæt i træk ligner hinanden.
    const last = sets[sets.length - 1];
    setSets([...sets, { id: nextId.current++, reps: last?.reps ?? "", weightKg: last?.weightKg ?? "" }]);
  }

  function removeSet(id: number) {
    setSets((current) => current.length > 1 ? current.filter((set) => set.id !== id) : current);
  }

  function updateSet(id: number, field: "reps" | "weightKg", value: string) {
    setSets((current) => current.map((set) => set.id === id ? { ...set, [field]: value } : set));
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
        <select name="exerciseId" required className={inputClass}>
          {filteredExercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        {sets.map((set, index) => (
          <div key={set.id} className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              {index === 0 && "Reps"}
              <input
                name="reps"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={set.reps}
                onChange={(event) => updateSet(set.id, "reps", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              {index === 0 && "Vægt (kg)"}
              <input
                name="weightKg"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                required
                value={set.weightKg}
                onChange={(event) => updateSet(set.id, "weightKg", event.target.value)}
                className={inputClass}
              />
            </label>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(set.id)}
                aria-label={`Fjern sæt ${index + 1}`}
                className="min-h-12 rounded border border-zinc-300 px-3 text-sm text-zinc-500 dark:border-zinc-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSet}
          className="self-start rounded border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
        >
          + Tilføj sæt
        </button>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground px-4 py-3 text-base font-medium text-background disabled:opacity-50"
      >
        {isPending ? "Gemmer…" : sets.length === 1 ? "Gem sæt" : `Gem ${sets.length} sæt`}
      </button>
    </form>
  );
}
