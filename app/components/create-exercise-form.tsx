"use client";

import { useState } from "react";
import type { CreateExerciseState } from "@/app/log/actions";
import { HEALTH_NOTICE, healthWarning } from "@/lib/health-notice";
import { MUSCLE_GROUPS, muscleGroupLabel } from "@/lib/muscle-groups";
import type { ExerciseType, MuscleGroup } from "@/lib/types";

const inputClass = "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm focus:border-indigo-600";
const labelClass = "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

// Selve <form id={formId} action=...>-elementet skal ligge UDEN FOR den
// omkringliggende log-formular (nestede <form>-tags er ugyldigt HTML, og
// knappen ville ellers sende den ydre formular i stedet). Felterne herunder
// hører til den via HTML's form-attribut.
export function CreateExerciseForm({
  formId,
  type,
  state,
  isPending,
  onCancel,
}: {
  formId: string;
  type: ExerciseType;
  state: CreateExerciseState;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [selectedGroups, setSelectedGroups] = useState<Set<MuscleGroup>>(new Set());
  // Kontrolleret, så navnet bevares efter en fejl (React nulstiller ellers
  // ukontrollerede felter efter hver formularhandling).
  const [name, setName] = useState("");
  const healthError = healthWarning(name);
  // Serveren fandt øvelser, der ligner. Gælder kun, så længe navnet er det samme.
  const similar = state.similar && state.similarFor === name.trim() ? state.similar : null;

  function toggleGroup(group: MuscleGroup) {
    setSelectedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
      <input form={formId} type="hidden" name="type" value={type} />
      {[...selectedGroups].map((group) => (
        <input key={group} form={formId} type="hidden" name="muscleGroups" value={group} />
      ))}

      <div>
        <label className={labelClass} htmlFor={`${formId}-name`}>Navn på ny øvelse</label>
        <input
          id={`${formId}-name`}
          form={formId}
          name="name"
          type="text"
          required
          maxLength={100}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Du kan bruge øvelsen med det samme. Den er kun synlig for dig, til en admin har godkendt den. {HEALTH_NOTICE}</p>
        {healthError && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{healthError}</p>}
      </div>

      {type === "strength" && (
        <div>
          <p className={labelClass}>Muskelgrupper</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => toggleGroup(group)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  selectedGroups.has(group)
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
                }`}
              >
                {muscleGroupLabel[group]}
              </button>
            ))}
          </div>
        </div>
      )}

      {similar && (
        <div role="alert" className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
          <input form={formId} type="hidden" name="confirmSimilar" value={state.similarFor} />
          <p>Findes den allerede? Disse ligner:</p>
          <ul className="list-disc pl-5 font-medium">
            {similar.map((label) => <li key={label}>{label}</li>)}
          </ul>
          <p>Vælg den i listen, hvis det er den samme. Ellers tryk Opret alligevel.</p>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm leading-6 text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          form={formId}
          disabled={isPending || Boolean(healthError)}
          className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Opretter…" : similar ? "Opret alligevel" : "Opret øvelse"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400"
        >
          Annullér
        </button>
      </div>
    </div>
  );
}
