"use client";

import { useActionState, useState } from "react";
import { PencilSimple, TrashSimple } from "@phosphor-icons/react";
import {
  deleteStrengthSetAction,
  updateStrengthSetAction,
  type UpdateStrengthSetState,
} from "@/app/components/entry-actions";
import type { StrengthEntry } from "@/lib/types";

const initialState: UpdateStrengthSetState = {};
const inputClass = "w-16 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 shadow-sm focus:border-indigo-600";

// Rækkerne vises på to steder (log-siden og historik-detaljer), derfor én
// delt komponent, der selv styrer sin egen visnings-/redigeringstilstand.
export function StrengthEntryRow({ entry, label }: { entry: StrengthEntry; label: string }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateStrengthSetAction, initialState);

  // Lukker redigeringen efter et vellykket gem. Justeret under renderingen
  // (ikke i en effect), som React anbefaler for at reagere på et prop, der
  // ændrer sig, se "you might not need an effect" i Reacts dokumentation.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-1.5 py-1">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={entry.id} />
          <span className="w-14 shrink-0 text-sm text-zinc-500">{label}</span>
          <input
            name="reps" type="number" inputMode="numeric" min={1} step={1} required
            defaultValue={entry.reps} aria-label="Reps" className={inputClass}
          />
          <span className="text-xs text-zinc-400">×</span>
          <input
            name="weightKg" type="number" inputMode="decimal" min={0} step={0.5} required
            defaultValue={entry.weight_kg} aria-label="Vægt (kg)" className={inputClass}
          />
          <span className="text-xs text-zinc-400">kg</span>
          <button
            type="submit" disabled={isPending}
            className="min-h-8 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "Gemmer…" : "Gem"}
          </button>
          <button
            type="button" onClick={() => setEditing(false)}
            className="min-h-8 rounded-lg border border-zinc-300 px-3 text-xs text-zinc-600"
          >
            Annullér
          </button>
        </form>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 text-sm text-zinc-500">
      <span className="w-14 shrink-0">{label}</span>
      <span className="font-mono tabular-nums text-zinc-700">{entry.weight_kg} kg × {entry.reps}</span>
      <div className="ml-auto flex shrink-0 gap-1">
        <button
          type="button" onClick={() => setEditing(true)} aria-label="Ret sæt"
          className="min-h-8 min-w-8 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600"
        >
          <PencilSimple size={16} />
        </button>
        <form action={deleteStrengthSetAction}>
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit" aria-label="Slet sæt"
            onClick={(event) => { if (!confirm("Slet dette sæt?")) event.preventDefault(); }}
            className="min-h-8 min-w-8 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
          >
            <TrashSimple size={16} />
          </button>
        </form>
      </div>
    </li>
  );
}
