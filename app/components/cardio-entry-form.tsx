"use client";

import { useActionState, useState } from "react";
import { logCardioEntry, type LogCardioEntryState } from "@/app/log/actions";
import { formatPace } from "@/lib/format";
import type { Exercise } from "@/lib/types";

const initialState: LogCardioEntryState = {};
const inputClass = "rounded border border-zinc-300 bg-transparent p-3 text-base dark:border-zinc-700";

export function CardioEntryForm({ exercises }: { exercises: Exercise[] }) {
  const [state, formAction, isPending] = useActionState(logCardioEntry, initialState);
  const [distanceKm, setDistanceKm] = useState(state.values?.distanceKm ?? "");
  const [minutes, setMinutes] = useState(state.values?.minutes ?? "");
  const [seconds, setSeconds] = useState(state.values?.seconds ?? "0");

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

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Øvelse
        <select name="exerciseId" required defaultValue={state.values?.exerciseId} className={inputClass}>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Distance (km)
        <input
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
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Minutter
          <input
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
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          Sekunder
          <input
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
        </label>
      </div>

      {pace && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pace: {pace}</p>
      )}

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground px-4 py-3 text-base font-medium text-background disabled:opacity-50"
      >
        {isPending ? "Gemmer…" : "Gem cardio"}
      </button>
    </form>
  );
}
