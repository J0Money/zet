"use client";

import { useActionState, useState } from "react";
import { PencilSimple, TrashSimple } from "@phosphor-icons/react";
import {
  deleteCardioEntryAction,
  updateCardioEntryAction,
  type UpdateCardioEntryState,
} from "@/app/components/entry-actions";
import { formatCardio, formatPace } from "@/lib/format";
import type { CardioEntry } from "@/lib/types";

const initialState: UpdateCardioEntryState = {};
const inputClass = "w-16 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 shadow-sm focus:border-indigo-600";

export function CardioEntryRow({ entry }: { entry: CardioEntry }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateCardioEntryAction, initialState);
  const minutes = Math.floor(entry.duration_sec / 60);
  const seconds = entry.duration_sec % 60;

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
          <input
            name="distanceKm" type="number" inputMode="decimal" min={0.1} step={0.1} required
            defaultValue={entry.distance_km} aria-label="Distance (km)" className={inputClass}
          />
          <span className="text-xs text-zinc-400">km på</span>
          <input
            name="minutes" type="number" inputMode="numeric" min={0} step={1} required
            defaultValue={minutes} aria-label="Minutter" className={inputClass}
          />
          <span className="text-xs text-zinc-400">min</span>
          <input
            name="seconds" type="number" inputMode="numeric" min={0} max={59} step={1} required
            defaultValue={seconds} aria-label="Sekunder" className={inputClass}
          />
          <span className="text-xs text-zinc-400">sek</span>
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
      <span>
        {formatCardio(entry.distance_km, entry.duration_sec)}
        {formatPace(entry.distance_km, entry.duration_sec) && (
          <> · {formatPace(entry.distance_km, entry.duration_sec)}</>
        )}
      </span>
      <div className="ml-auto flex shrink-0 gap-1">
        <button
          type="button" onClick={() => setEditing(true)} aria-label="Ret cardio"
          className="min-h-8 min-w-8 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600"
        >
          <PencilSimple size={16} />
        </button>
        <form action={deleteCardioEntryAction}>
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit" aria-label="Slet cardio"
            onClick={(event) => { if (!confirm("Slet denne cardio-registrering?")) event.preventDefault(); }}
            className="min-h-8 min-w-8 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
          >
            <TrashSimple size={16} />
          </button>
        </form>
      </div>
    </li>
  );
}
