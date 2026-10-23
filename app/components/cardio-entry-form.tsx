"use client";

import { useActionState, useMemo, useState } from "react";
import { createExerciseAction, logCardioEntry, type CreateExerciseState, type LogCardioEntryState } from "@/app/log/actions";
import { CreateExerciseForm } from "@/app/components/create-exercise-form";
import { formatPace } from "@/lib/format";
import type { Exercise, TrainingProgram } from "@/lib/types";

const initialState: LogCardioEntryState = {};
const initialCreateState: CreateExerciseState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm focus:border-indigo-600";
const labelClass = "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function CardioEntryForm({ exercises, programs }: { exercises: Exercise[]; programs: TrainingProgram[] }) {
  const [state, formAction, isPending] = useActionState(logCardioEntry, initialState);
  const [createState, createFormAction, isCreatingExercise] = useActionState(createExerciseAction, initialCreateState);
  const [distanceKm, setDistanceKm] = useState(state.values?.distanceKm ?? "");
  const [minutes, setMinutes] = useState(state.values?.minutes ?? "");
  const [seconds, setSeconds] = useState(state.values?.seconds ?? "0");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [exerciseSelectKey, setExerciseSelectKey] = useState(0);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | undefined>(undefined);

  // Efter en oprettet øvelse: føj den til listen, nulstil program-filteret,
  // og tving <select> til at vælge den (key-remount, da defaultValue kun
  // virker ved selve monteringen).
  // Justeres under selve renderingen (ikke i en effect), som React anbefaler.
  const [prevCreateState, setPrevCreateState] = useState(createState);
  if (createState !== prevCreateState) {
    setPrevCreateState(createState);
    if (createState.exercise) {
      setCustomExercises((current) => [...current, createState.exercise!]);
      setSelectedProgramId(null);
      setPendingExerciseId(createState.exercise.id);
      setExerciseSelectKey((count) => count + 1);
      setShowCreateForm(false);
    }
  }

  // Felterne skal også vise de tastede værdier igen efter en fejl fra serveren.
  // Justeres under selve renderingen (ikke i en effect), som React anbefaler
  // for at synkronisere state med et prop, der ændrer sig, se "you might not
  // need an effect" i Reacts egen dokumentation.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.values) {
      setDistanceKm(state.values.distanceKm);
      setMinutes(state.values.minutes);
      setSeconds(state.values.seconds);
    }
  }

  const durationSec = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
  const pace = formatPace(Number(distanceKm), durationSec);
  // Serveren sender den nye øvelse med igen, når siden genindlæses efter
  // oprettelsen, så den lokale kopi skal ud, hvis den allerede er med.
  const allExercises = useMemo(() => {
    const serverIds = new Set(exercises.map((exercise) => exercise.id));
    return [...exercises, ...customExercises.filter((exercise) => !serverIds.has(exercise.id))];
  }, [exercises, customExercises]);
  const selectedProgram = programs.find((program) => program.id === selectedProgramId);
  const programExerciseIds = selectedProgram ? new Set(selectedProgram.exercise_ids) : null;
  const filteredExercises = programExerciseIds
    ? allExercises.filter((exercise) => programExerciseIds.has(exercise.id))
    : allExercises;

  return (
    <>
    <form id="create-cardio-exercise" action={createFormAction} />
    <form action={formAction} className="flex flex-col gap-5">
      {programs.length > 0 && (
        <div>
          <p className={labelClass}>Program</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedProgramId(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                selectedProgramId === null
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
              }`}
            >
              Alle
            </button>
            {programs.map((program) => (
              <button
                key={program.id}
                type="button"
                onClick={() => setSelectedProgramId(program.id === selectedProgramId ? null : program.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  selectedProgramId === program.id
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
                }`}
              >
                {program.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="exerciseId">Øvelse</label>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
            >
              + Opret ny øvelse
            </button>
          )}
        </div>
        <select
          key={exerciseSelectKey}
          id="exerciseId"
          name="exerciseId"
          required
          defaultValue={pendingExerciseId ?? state.values?.exerciseId}
          className={inputClass}
        >
          {filteredExercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </div>

      {showCreateForm && (
        <CreateExerciseForm
          formId="create-cardio-exercise"
          type="cardio"
          state={createState}
          isPending={isCreatingExercise}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div>
        <label className={labelClass} htmlFor="distanceKm">Distance (km)</label>
        <input
          id="distanceKm"
          name="distanceKm"
          type="number"
          inputMode="decimal"
          min={0.1}
          step={0.1}
          required
          value={distanceKm}
          onChange={(event) => setDistanceKm(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass} htmlFor="minutes">Minutter</label>
          <input
            id="minutes"
            name="minutes"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex-1">
          <label className={labelClass} htmlFor="seconds">Sekunder</label>
          <input
            id="seconds"
            name="seconds"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={1}
            required
            value={seconds}
            onChange={(event) => setSeconds(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {pace && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pace: <span className="font-medium text-zinc-700 dark:text-zinc-300">{pace}</span></p>
      )}

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm leading-6 text-red-800 dark:text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Gemmer…" : "Gem cardio"}
      </button>
    </form>
    </>
  );
}
