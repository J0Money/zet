"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createExerciseAction, logStrengthSet, type CreateExerciseState, type LogStrengthSetState } from "@/app/log/actions";
import { Confetti } from "@/app/components/confetti";
import { CreateExerciseForm } from "@/app/components/create-exercise-form";
import { EquipmentWheel } from "@/app/components/equipment-wheel";
import { ExerciseNote } from "@/app/components/exercise-note";
import { choiceKey, defaultWheelKey, groupExercises, wheelOptions, type WheelKey } from "@/lib/exercise-groups";
import { MUSCLE_GROUPS, muscleGroupLabel } from "@/lib/muscle-groups";
import type { Exercise, MuscleGroup, TrainingProgram } from "@/lib/types";
import type { ExerciseHistory } from "@/lib/workouts";
import { formatSetsSummary } from "@/lib/format";
import { formatDateDanish } from "@/lib/dates";
import { useLocalDraft, draftField } from "@/app/components/use-local-draft";
import { draftKey, emptyStrengthDraft, isStrengthDraft } from "@/lib/log-draft";

const initialState: LogStrengthSetState = {};
const initialCreateState: CreateExerciseState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm focus:border-indigo-600";
const labelClass = "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

type SetRow = { id: number; reps: string; weightKg: string };

function emptySet(id: number): SetRow {
  return { id, reps: "", weightKg: "" };
}

export function StrengthSetForm({ userId, exercises, programs, exerciseHistory, exerciseNotes, preferredEquipment }: {
  userId: string;
  exercises: Exercise[];
  programs: TrainingProgram[];
  exerciseHistory: Record<string, ExerciseHistory>;
  exerciseNotes: Record<string, string>;
  preferredEquipment: Record<string, WheelKey>;
}) {
  const [state, formAction, isPending] = useActionState(logStrengthSet, initialState);
  const [createState, createFormAction, isCreatingExercise] = useActionState(createExerciseAction, initialCreateState);
  const { draft, setDraft, clearDraft } = useLocalDraft(draftKey(userId, "strength"), emptyStrengthDraft, isStrengthDraft);
  const { selectedTags, selectedProgramId, searchQuery, selectedChoiceKey, slotByChoice, sets } = draft;
  const setSelectedTags = draftField(setDraft, "selectedTags");
  const setSelectedProgramId = draftField(setDraft, "selectedProgramId");
  const setSearchQuery = draftField(setDraft, "searchQuery");
  const setSelectedChoiceKey = draftField(setDraft, "selectedChoiceKey");
  const setSlotByChoice = draftField(setDraft, "slotByChoice");
  const setSets = draftField(setDraft, "sets");
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Hvilket udstyr (plads på hjulet) der sidst er valgt i hver gruppe, så valget
  // huskes, hvis man skifter øvelse og tilbage igen. Gemt som udstyr og ikke som
  // id, så valget består, når en ny variant er blevet oprettet.
  const nextId = useRef(1);
  const newRowId = () => Math.max(nextId.current++, ...sets.map((row) => row.id + 1));
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Efter et vellykket gem starter listen af sæt forfra, klar til næste
  // øvelse, og en ny rekord udløser konfetti.
  const [previousResult, setPreviousResult] = useState(state);
  if (state !== previousResult) {
    setPreviousResult(state);
    if (state.success) {
      setDraft({ ...draft, sets: [emptySet(0)] });
      if (state.newRecord) setConfettiTrigger((count) => count + 1);
    }
  }
  useEffect(() => {
    if (state.success) clearDraft({ ...draft, sets: [emptySet(0)] });
    // Kun et nyt svar fra serveren må rydde kladden, ikke næste indtastning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, clearDraft]);

  // Efter en oprettet øvelse: føj den til listen, nulstil filtrene (så den
  // garanteret er synlig uanset hvad der var valgt), og vælg den, også på
  // hjulet, hvis den er en ny variant i en gruppe.
  // Justeres under selve renderingen (ikke i en effect), som React anbefaler.
  const [prevCreateState, setPrevCreateState] = useState(createState);
  if (createState !== prevCreateState) {
    setPrevCreateState(createState);
    const created = createState.exercise;
    if (created) {
      const key = choiceKey(created);
      setCustomExercises((current) => [...current, created]);
      setSelectedProgramId(null);
      setSelectedTags([]);
      setSearchQuery("");
      setSelectedChoiceKey(key);
      setSlotByChoice((current) => ({ ...current, [key]: "none" }));
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
    .filter((exercise) => selectedTags.length === 0 || exercise.muscle_groups.some((group) => selectedTags.includes(group)))
    .filter((exercise) => !programExerciseIds || programExerciseIds.has(exercise.id))
    .filter((exercise) => !normalizedQuery || exercise.name.toLowerCase().includes(normalizedQuery));
  const choices = groupExercises(filteredExercises);
  const currentChoice = choices.find((choice) => choice.key === selectedChoiceKey) ?? choices[0];
  const wheelSlots = currentChoice ? wheelOptions(currentChoice) : [];
  const currentSlot = currentChoice
    ? wheelSlots.find((slot) => slot.key === slotByChoice[currentChoice.key]) ??
      wheelSlots.find((slot) => slot.key === preferredEquipment[currentChoice.key]) ??
      wheelSlots.find((slot) => slot.key === defaultWheelKey(wheelSlots))
    : undefined;

  function toggleTag(group: MuscleGroup) {
    setSelectedTags((current) => {
      return current.includes(group) ? current.filter((tag) => tag !== group) : [...current, group];
    });
  }

  // Brug kun den præcise variant, aldrig en anden plads i samme gruppe.
  const selectedHistory = currentSlot?.variant ? exerciseHistory[currentSlot.variant.id] : undefined;
  const lastSet = selectedHistory?.lastSets.at(-1);

  function reuseLastSet() {
    if (!lastSet || isPending) return;
    const row = { id: newRowId(), reps: String(lastSet.reps), weightKg: String(lastSet.weight_kg) };
    setSets((current) => {
      const last = current.at(-1);
      // Bevar alle indtastninger. Udfyld en tom sidste række, ellers tilføj én.
      return last && last.reps === "" && last.weightKg === ""
        ? [...current.slice(0, -1), row]
        : [...current, row];
    });
  }

  function addSet() {
    // Nye sæt arver reps/vægt fra det forrige, de fleste sæt i træk ligner hinanden.
    const last = sets[sets.length - 1];
    setSets([...sets, { id: newRowId(), reps: last?.reps ?? "", weightKg: last?.weightKg ?? "" }]);
  }

  function removeSet(id: number) {
    setSets((current) => current.length > 1 ? current.filter((set) => set.id !== id) : current);
  }

  function updateSet(id: number, field: "reps" | "weightKg", value: string) {
    setDraft((current) => ({
      ...current,
      selectedChoiceKey: currentChoice?.key ?? null,
      slotByChoice: currentChoice && currentSlot
        ? { ...current.slotByChoice, [currentChoice.key]: currentSlot.key } : current.slotByChoice,
      sets: current.sets.map((set) => set.id === id ? { ...set, [field]: value } : set),
    }));
  }

  return (
    <>
    <form id="create-strength-exercise" action={createFormAction} />
    <form action={formAction} inert={isPending} className="flex flex-col gap-5">
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
              onClick={() => setSelectedTags([])}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                selectedTags.length === 0
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
                  selectedTags.includes(group)
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
            <select
              id="exerciseId"
              value={currentChoice?.key ?? ""}
              onChange={(event) => setSelectedChoiceKey(event.target.value)}
              className={inputClass}
            >
              {choices.map((choice) => (
                <option key={choice.key} value={choice.key}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Valglisten viser kun grupper. Serveren finder (eller opretter) varianten ud fra et medlem af gruppen og udstyret. */}
        <input type="hidden" name="exerciseId" value={(currentSlot?.variant ?? currentChoice?.variants[0])?.id ?? ""} />
        <input type="hidden" name="equipment" value={currentSlot?.key ?? ""} />
        {currentChoice && currentSlot && (
          <div className="mt-3">
            <EquipmentWheel
              options={wheelSlots}
              selectedKey={currentSlot.key}
              onSelect={(key) => setSlotByChoice((current) => ({ ...current, [currentChoice.key]: key }))}
            />
            {!currentSlot.variant && (
              <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Ny variant, den oprettes, når du gemmer et sæt eller en note.
              </p>
            )}
          </div>
        )}
        {filteredExercises.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Ingen øvelser matcher. Prøv en anden søgning, eller opret den som ny øvelse.</p>
        )}
        {currentChoice && (
          <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm" aria-label="Din øvelseshistorik">
            <div aria-live="polite" className="space-y-2">
              <p className="text-zinc-600 dark:text-zinc-300">
                {selectedHistory?.lastDate
                  ? <><span className="font-medium">Sidst {formatDateDanish(selectedHistory.lastDate)}:</span> {formatSetsSummary(selectedHistory.lastSets, true)}</>
                  : selectedHistory ? "Ingen tidligere afsluttede pas med denne variant." : "Ingen tidligere sæt med denne variant."}
              </p>
              {selectedHistory && (
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <abbr title="Personlig rekord" className="no-underline">PR</abbr>: {formatSetsSummary([selectedHistory.best], true)}
                </p>
              )}
            </div>
            {lastSet && (
              <button type="button" onClick={reuseLastSet} disabled={isPending}
                className="mt-2 min-h-11 rounded-lg border border-indigo-200 dark:border-indigo-800 px-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-50">
                Brug sidste sæt
              </button>
            )}
          </div>
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
                aria-label={`Gentagelser, sæt ${index + 1}`}
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
                aria-label={`Vægt i kg, sæt ${index + 1}`}
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
        {currentChoice && currentSlot ? (
          <ExerciseNote key={`${currentChoice.key}:${currentSlot.key}`}
            exerciseId={(currentSlot.variant ?? currentChoice.variants[0]).id}
            equipment={currentSlot.key}
            note={currentSlot.variant ? exerciseNotes[currentSlot.variant.id] ?? "" : ""}>
            <button type="button" onClick={addSet}
              className="min-h-11 self-start rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600">
              + Tilføj sæt
            </button>
          </ExerciseNote>
        ) : <button
          type="button"
          onClick={addSet}
          className="min-h-11 self-start rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 hover:text-indigo-600"
        >
          + Tilføj sæt
        </button>}
      </div>

      {state.warning && <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">{state.warning}</p>}
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
