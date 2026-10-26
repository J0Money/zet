"use client";

import { startTransition, useActionState, useId, useState, type ReactNode } from "react";
import { saveExerciseNote, type ExerciseNoteState } from "@/app/log/actions";

const initialState: ExerciseNoteState = {};

export function ExerciseNote({ exerciseId, equipment, note, children }: {
  exerciseId: string;
  equipment: string;
  note: string;
  children: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveExerciseNote, initialState);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note);
  const [previousState, setPreviousState] = useState(state);
  const inputId = useId();
  if (state !== previousState) {
    setPreviousState(state);
    if (state.savedNote !== undefined) {
      setText(state.savedNote);
      setEditing(false);
    }
  }
  const savedNote = state.savedNote ?? note;
  const buttonClass = "min-h-11 text-sm font-medium text-indigo-600 dark:text-indigo-400 disabled:opacity-50";
  function save(value: string) {
    startTransition(() => action({ exerciseId, equipment, note: value }));
  }

  return (
    <section className="space-y-3 text-sm" aria-label="Sæt og huskenote">
      <div className="flex flex-wrap gap-2">
        {children}
        {!editing && !savedNote && (
          <button type="button"
            className="min-h-11 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600"
            onClick={() => { setText(""); setEditing(true); }}>+ Tilføj note</button>
        )}
      </div>
      {!editing ? (
        savedNote ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
            <p className="mb-1 font-medium">Husk til næste gang</p>
            <p className="whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-300">{savedNote}</p>
            <button type="button" className={buttonClass} onClick={() => { setText(savedNote); setEditing(true); }}>Rediger note</button>
          </div>
        ) : null
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
          <label htmlFor={inputId} className="mb-2 block font-medium">Husk til næste gang</label>
          <textarea id={inputId} value={text} onChange={(event) => setText(event.target.value)}
            maxLength={500} rows={3} disabled={pending} placeholder="Fx Sæde 4 · ryglæn 2 eller Bænk 30°"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-base" />
          <p className="mt-1 text-xs text-zinc-500">Kun synlig for dig, på denne øvelsesvariant.</p>
          <div className="flex flex-wrap gap-x-5">
            <button type="button" disabled={pending} className={buttonClass} onClick={() => save(text)}>{pending ? "Gemmer…" : "Gem note"}</button>
            <button type="button" disabled={pending} className={buttonClass} onClick={() => setEditing(false)}>Annuller</button>
            {savedNote && <button type="button" disabled={pending} className="min-h-11 text-sm text-red-600 disabled:opacity-50" onClick={() => save("")}>Fjern note</button>}
          </div>
        </div>
      )}
      {state.error && editing && <p role="alert" className="mt-2 text-red-600">{state.error}</p>}
    </section>
  );
}
