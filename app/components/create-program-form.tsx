"use client";

import { useActionState, useState } from "react";
import { createProgramAction, type CreateProgramState } from "@/app/programs/actions";
import type { Exercise } from "@/lib/types";

const initialState: CreateProgramState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-indigo-600";

export function CreateProgramForm({ exercises }: { exercises: Exercise[] }) {
  const [state, formAction, isPending] = useActionState(createProgramAction, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const strengthExercises = exercises.filter((exercise) => exercise.type === "strength");
  const cardioExercises = exercises.filter((exercise) => exercise.type === "cardio");

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setSelected(new Set());
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700" htmlFor="name">Navn</label>
        <input id="name" name="name" type="text" required maxLength={100} placeholder="Fx Pushdag" className={inputClass} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-zinc-700">Øvelser</p>
        {[
          { label: "Styrke", list: strengthExercises },
          { label: "Cardio", list: cardioExercises },
        ].map(({ label, list }) => list.length > 0 && (
          <div key={label}>
            <p className="mb-1.5 text-xs font-medium text-zinc-500">{label}</p>
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-2">
              {list.map((exercise) => (
                <label key={exercise.id} className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    name="exerciseIds"
                    value={exercise.id}
                    checked={selected.has(exercise.id)}
                    onChange={() => toggle(exercise.id)}
                    className="size-4 accent-indigo-600"
                  />
                  {exercise.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Opretter…" : "Opret program"}
      </button>
    </form>
  );
}
