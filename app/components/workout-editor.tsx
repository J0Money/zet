"use client";
import { useActionState, useState } from "react";
import type { Entry, Exercise, Workout } from "@/lib/types";
import { localWorkoutTime, type EditEntry } from "@/lib/workout-edit-input";
import { saveWorkoutAction, deleteWorkoutAction } from "@/app/history/actions";
import { choiceKey, groupExercises } from "@/lib/exercise-groups";
import { EQUIPMENT, equipmentLabel } from "@/lib/equipment";
const field = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700";
const button = "min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700";
function ExerciseEquipmentSelect({ exercises, entry, onChange }: { exercises: Exercise[]; entry: EditEntry; onChange: (patch: Partial<EditEntry>) => void }) {
  const choices = groupExercises(exercises.filter((exercise) => exercise.type === entry.kind))
    .sort((a, b) => a.label.localeCompare(b.label, "da"));
  const selected = exercises.find((exercise) => exercise.id === entry.exercise_id);
  const group = selected ? choices.find((choice) => choice.key === choiceKey(selected)) : undefined;
  const equipment = entry.equipment ?? selected?.equipment ?? "none";
  const colors = "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50";
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="min-w-0 text-sm">Øvelse<select required className={`${field} ${colors}`} value={group?.key ?? ""} onChange={(event) => {
      const next = choices.find((choice) => choice.key === event.target.value);
      const variant = next?.variants.find((exercise) => (exercise.equipment ?? "none") === equipment) ?? next?.variants[0];
      if (variant) onChange({ exercise_id: variant.id, equipment });
    }}>
      {!group && <option value="" disabled className={colors}>Vælg øvelse</option>}
      {choices.map((choice) => <option className={colors} key={choice.key} value={choice.key}>{choice.label}</option>)}
    </select></label>
    <label className="min-w-0 text-sm">Udstyr<select required disabled={!group} className={`${field} ${colors}`} value={group ? equipment : ""} onChange={(event) => onChange({ equipment: event.target.value as EditEntry["equipment"] })}>
      {!group && <option value="" className={colors}>Vælg øvelse først</option>}
      <option className={colors} value="none">Uden udstyr</option>
      {EQUIPMENT.map((item) => <option className={colors} key={item} value={item}>{equipmentLabel[item]}</option>)}
    </select></label>
  </div>;
}
export function WorkoutEditor({ workout, entries, exercises, version, shared }: { workout: Workout; entries: Entry[]; exercises: Exercise[]; version: string; shared: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveWorkoutAction, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteWorkoutAction, {});
  const [draft, setDraft] = useState<EditEntry[]>(entries);
  const [openedVersion, setOpenedVersion] = useState(version);
  const [previous, setPrevious] = useState(state);
  if (previous !== state) { setPrevious(state); if (state.success) setOpen(false); }
  function change(index: number, patch: Partial<EditEntry>) { setDraft(draft.map((entry, i) => i === index ? { ...entry, ...patch } as EditEntry : entry)); }
  function add(kind: "strength" | "cardio") {
    const exercise = exercises.find((item) => item.type === kind);
    if (!exercise) return;
    const common = { id: crypto.randomUUID(), workout_id: workout.id, exercise_id: exercise.id };
    setDraft([...draft, kind === "strength" ? { ...common, kind, reps: 10, weight_kg: 0 } : { ...common, kind, distance_km: 1, duration_sec: 300 }]);
  }
  if (!open) return <div className="space-y-2"><button className={button} onClick={() => { setDraft(entries); setOpenedVersion(version); setOpen(true); }}>Rediger træning</button>{state.success && <p role="status" className="text-sm text-zinc-500">Ændringerne er gemt.</p>}</div>;
  return <section className="zet-panel space-y-5">
    <h2 className="zet-sectionTitle">Rediger træning</h2>
    <p className="text-sm text-zinc-500">Alle rettelser gemmes samlet. Tidspunkter er i dansk tid.</p>
    {shared && <p className="text-sm text-zinc-500">Dit delte Community-opslag beholder den version, du allerede har delt.</p>}
    <form action={async (data: FormData) => { data.set("payload", JSON.stringify({ date: data.get("date"), start: data.get("start"), end: data.get("end"), notes: data.get("notes"), entries: draft })); action(data); }} onSubmit={(event) => {
      if (entries.some((entry) => !draft.some((item) => item.id === entry.id)) && !confirm("Gem ændringerne og slet de fjernede sæt?")) event.preventDefault();
    }}>
      <input type="hidden" name="id" value={workout.id} /><input type="hidden" name="version" value={openedVersion} />
      <fieldset disabled={pending || deleting} className="space-y-5 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Dato<input className={field} name="date" type="date" required defaultValue={workout.date} /></label>
          <div className="hidden sm:block" />
          <label className="min-w-0 text-sm">Start<input className={field} name="start" type="datetime-local" step="1" defaultValue={localWorkoutTime(workout.started_at)} /></label>
          <label className="min-w-0 text-sm">Slut<input className={field} name="end" type="datetime-local" step="1" defaultValue={localWorkoutTime(workout.ended_at)} /></label>
        </div>
        <p className="text-xs text-zinc-500">Ældre pas kan beholde tomme tidspunkter. Hvis du retter datoen, skal starttidspunktet også være på den dag.</p>
        <label className="block text-sm">Privat note<textarea className={field} name="notes" rows={2} maxLength={5000} defaultValue={workout.notes} /></label>
        <div className="space-y-4">{draft.map((entry, index) => <div key={entry.id} className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{entry.kind === "strength" ? "Sæt" : "Cardio"} {index + 1}</p><button className="min-h-11 px-2 text-sm text-red-600" type="button" onClick={() => setDraft(draft.filter((item) => item.id !== entry.id))}>Fjern</button></div>
          <ExerciseEquipmentSelect exercises={exercises} entry={entry} onChange={(patch) => change(index, patch)} />
          {entry.kind === "strength" ? <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Kg<input className={field} type="number" min="0" max="100000" step="any" required value={Number.isNaN(entry.weight_kg) ? "" : entry.weight_kg} onChange={(e) => change(index, { weight_kg: e.target.valueAsNumber })} /></label>
            <label className="text-sm">Gentagelser<input className={field} type="number" min="1" max="10000" step="1" required value={Number.isNaN(entry.reps) ? "" : entry.reps} onChange={(e) => change(index, { reps: e.target.valueAsNumber })} /></label>
          </div> : <div className="grid grid-cols-3 gap-2">
            <label className="text-sm">Km<input className={field} type="number" min="0.001" max="100000" step="any" required value={Number.isNaN(entry.distance_km) ? "" : entry.distance_km} onChange={(e) => change(index, { distance_km: e.target.valueAsNumber })} /></label>
            <label className="text-sm">Minutter<input className={field} type="number" min="0" step="1" required value={Math.floor(entry.duration_sec / 60)} onChange={(e) => change(index, { duration_sec: (Number(e.target.value) * 60) + entry.duration_sec % 60 })} /></label>
            <label className="text-sm">Sekunder<input className={field} type="number" min="0" max="59" step="1" required value={entry.duration_sec % 60} onChange={(e) => change(index, { duration_sec: Math.floor(entry.duration_sec / 60) * 60 + Number(e.target.value) })} /></label>
          </div>}
        </div>)}</div>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!exercises.some((e) => e.type === "strength")} onClick={() => add("strength")}>Tilføj sæt</button><button type="button" className={button} disabled={!exercises.some((e) => e.type === "cardio")} onClick={() => add("cardio")}>Tilføj cardio</button></div>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <div className="flex flex-wrap gap-3"><button className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white">{pending ? "Gemmer…" : "Gem ændringer"}</button><button type="button" className={button} onClick={() => { if (confirm("Kassér dine ugemte ændringer?")) setOpen(false); }}>Annullér</button></div>
      </fieldset>
    </form>
    <form action={deleteAction} onSubmit={(e) => { if (!confirm("Slet hele træningen? Alle sæt og et eventuelt delt opslag med kommentarer bliver slettet. Det kan ikke fortrydes.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={workout.id} /><button disabled={pending || deleting} className="min-h-11 text-sm text-red-600">{deleting ? "Sletter…" : "Slet hele træningen"}</button>
      {deleteState.error && <p role="alert" className="text-sm text-red-600">{deleteState.error}</p>}
    </form>
  </section>;
}
