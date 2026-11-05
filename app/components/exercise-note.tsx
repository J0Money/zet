"use client";

import { startTransition, useActionState, useEffect, useId, type ReactNode } from "react";
import { saveExerciseNote, type ExerciseNoteState } from "@/app/log/actions";
import { HEALTH_NOTICE, healthWarning } from "@/lib/health-notice";

const initialState: ExerciseNoteState = {};

// draft er den uafsluttede notetekst fra kladden (undefined = noten er ikke åben).
// Den ligger i formularens kladde og ikke her, så den består skift af øvelse eller udstyr.
export function ExerciseNote({ exerciseId, equipment, note, draft, onDraftChange, children }: {
  exerciseId: string;
  equipment: string;
  note: string;
  draft: string | undefined;
  onDraftChange: (value: string | undefined) => void;
  children: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveExerciseNote, initialState);
  const editing = draft !== undefined;
  const text = draft ?? "";
  const inputId = useId();
  // Når noten er gemt eller fjernet, er der ikke længere en uafsluttet tekst.
  useEffect(() => {
    if (state.savedNote !== undefined) onDraftChange(undefined);
    // Kun et nyt svar fra serveren må lukke noten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const savedNote = state.savedNote ?? note;
  const healthError = healthWarning(text);
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
            onClick={() => onDraftChange("")}>+ Tilføj note</button>
        )}
      </div>
      {!editing ? (
        savedNote ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
            <p className="mb-1 font-medium">Husk til næste gang</p>
            <p className="whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-300">{savedNote}</p>
            <button type="button" className={buttonClass} onClick={() => onDraftChange(savedNote)}>Rediger note</button>
          </div>
        ) : null
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
          <label htmlFor={inputId} className="mb-2 block font-medium">Husk til næste gang</label>
          <textarea id={inputId} value={text} onChange={(event) => onDraftChange(event.target.value)}
            maxLength={500} rows={3} disabled={pending} placeholder="Fx Sæde 4 · ryglæn 2 eller Bænk 30°"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-base" />
          <p className="mt-1 text-xs text-zinc-500">Kun synlig for dig, på denne øvelsesvariant. {HEALTH_NOTICE}</p>
          {healthError && <p role="alert" className="mt-2 text-red-600">{healthError}</p>}
          <div className="flex flex-wrap gap-x-5">
            <button type="button" disabled={pending || Boolean(healthError)} className={buttonClass} onClick={() => save(text)}>{pending ? "Gemmer…" : "Gem note"}</button>
            <button type="button" disabled={pending} className={buttonClass} onClick={() => onDraftChange(undefined)}>Annuller</button>
            {savedNote && <button type="button" disabled={pending} className="min-h-11 text-sm text-red-600 disabled:opacity-50" onClick={() => save("")}>Fjern note</button>}
          </div>
        </div>
      )}
      {state.error && editing && <p role="alert" className="mt-2 text-red-600">{state.error}</p>}
    </section>
  );
}
