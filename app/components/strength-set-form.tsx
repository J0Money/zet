"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createExerciseAction, logStrengthSet, type CreateExerciseState, type LogStrengthSetState } from "@/app/log/actions";
import { Confetti } from "@/app/components/confetti";
import { CreateExerciseForm } from "@/app/components/create-exercise-form";
import { MUSCLE_GROUPS, muscleGroupLabel } from "@/lib/muscle-groups";
import type { Exercise, MuscleGroup, TrainingProgram } from "@/lib/types";

const initialState: LogStrengthSetState = {};
const initialCreateState: CreateExerciseState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm focus:border-indigo-600";
const labelClass = "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

type SetRow = { id: number; reps: string; weightKg: string };

function emptySet(id: number): SetRow {
  return { id, reps: "", weightKg: "" };
}

export function StrengthSetForm({ exercises, programs }: { exercises: Exercise[]; programs: TrainingProgram[] }) {
  const [state, formAction, isPending] = useActionState(logStrengthSet, initialState);
  const [createState, createFormAction, isCreatingExercise] = useActionState(createExerciseAction, initialCreateState);
  const [selectedTags, setSelectedTags] = useState<Set<MuscleGroup>>(new Set());
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [exerciseSelectKey, setExerciseSelectKey] = useState(0);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | undefined>(undefined);
  const nextId = useRef(1);
  const [sets, setSets] = useState<SetRow[]>(() => [emptySet(0)]);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Efter et vellykket gem starter listen af sæt forfra, klar til næste
  // øvelse, og en ny rekord udløser konfetti.
  useEffect(() => {
    if (state.success) {
      setSets([emptySet(nextId.current++)]);
      if (state.newRecord) setConfettiTrigger((count) => count + 1);
    }
  }, [state]);

  // Efter en oprettet øvelse: føj den til listen, nulstil filtrene (så den
  // garanteret er synlig uanset hvad der var valgt), og tving <select> til
  // at vælge den (samme key-remount-trick som konfettien bruger, da
  // defaultValue kun virker ved selve monteringen).
  // Justeres under selve renderingen (ikke i en effect), som React anbefaler.
  const [prevCreateState, setPrevCreateState] = useState(createState);
  if (createState !== prevCreateState) {
    setPrevCreateState(createState);
    if (createState.exercise) {
      setCustomExercises((current) => [...current, createState.exercise!]);
      setSelectedProgramId(null);
      setSelectedTags(new Set());
      setSearchQuery("");
      setPendingExerciseId(createState.exercise.id);
      setExerciseSelectKey((count) => count + 1);
      setShowCreateForm(false);
    }
  }

  // Serveren sender den nye øvelse med igen, når siden genindlæses efter
  // oprettelsen, så den lokale kopi skal ud, hvis den allerede er med.
  const allExercises = useMemo(() => {
    const serverIds = new Set(exercises.map((exercise) => exercise.id));
    return [...exercises, ...customExercises.filter((exercise) => !serverIds.has(exercise.id))];
  }, [exercises, customExercises]);

  // Kun tags, der rent faktisk findes på en af øvelserne, vises som knapper.
  const availableTags = useMemo(
    () => MUSCLE_GROUPS.filter((group) => allExercises.some((exercise) => exercise.muscle_groups.includes(group))),
    [allExercises],
  );
  const selectedProgram = programs.find((program) => program.id === selectedProgramId);
  const programExerciseIds = selectedProgram ? new Set(selectedProgram.exercise_ids) : null;
  // Flere valgte tags virker som "eller": en øvelse vises, hvis den matcher
  // mindst ét af dem, fx "Ryg" + "Biceps" viser øvelser med enten tag. Et
  // valgt program indskrænker yderligere til kun dets egne øvelser, og
  // søgningen til dem, hvis navn indeholder teksten (uanset store/små bogstaver).
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredExercises = allExercises
    .filter((exercise) => selectedTags.size === 0 || exercise.muscle_groups.some((group) => selectedTags.has(group)))
    .filter((exercise) => !programExerciseIds || programExerciseIds.has(exercise.id))
    .filter((exercise) => !normalizedQuery || exercise.name.toLowerCase().includes(normalizedQuery));

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
    <>
    <form id="create-strength-exercise" action={createFormAction} />
    <form action={formAction} className="flex flex-col gap-5">
      <Confetti trigger={confettiTrigger} />

      {state.success && state.newRecord && (
        <p className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm font-medium leading-6 text-amber-800 dark:text-amber-200">
          🎉 Ny personlig rekord!
        </p>
      )}

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

      {availableTags.length > 0 && (
        <div>
          <p className={labelClass}>Filtrér på muskelgruppe</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTags(new Set())}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                selectedTags.size === 0
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300"
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
        <div className="flex gap-2">
          <div className="w-1/3 shrink-0">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              placeholder="Søg…"
              aria-label="Søg i øvelser"
              className={inputClass}
            />
          </div>
          <div className="min-w-0 flex-1">
            <select key={exerciseSelectKey} id="exerciseId" name="exerciseId" required defaultValue={pendingExerciseId} className={inputClass}>
              {filteredExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredExercises.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Ingen øvelser matcher. Prøv en anden søgning, eller opret den som ny øvelse.</p>
        )}
      </div>

      {showCreateForm && (
        <CreateExerciseForm
          formId="create-strength-exercise"
          type="strength"
          state={createState}
          isPending={isCreatingExercise}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="flex flex-col gap-3">
        {sets.map((set, index) => (
          <div key={set.id} className="flex items-end gap-2">
            <div className="flex-1">
              {index === 0 && <p className={labelClass}>Reps</p>}
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
            </div>
            <div className="flex-1">
              {index === 0 && <p className={labelClass}>Vægt (kg)</p>}
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
            </div>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(set.id)}
                aria-label={`Fjern sæt ${index + 1}`}
                className="min-h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 text-sm text-zinc-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSet}
          className="min-h-11 self-start rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600"
        >
          + Tilføj sæt
        </button>
      </div>

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
        {isPending ? "Gemmer…" : sets.length === 1 ? "Gem sæt" : `Gem ${sets.length} sæt`}
      </button>
    </form>
    </>
  );
}
