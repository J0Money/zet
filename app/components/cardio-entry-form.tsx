"use client";

import { useActionState, useState } from "react";
import { logCardioEntry, type LogCardioEntryState } from "@/app/log/actions";
import { formatPace } from "@/lib/format";
import type { Exercise } from "@/lib/types";

const initialState: LogCardioEntryState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-indigo-600";
const labelClass = "mb-2 block text-sm font-medium text-zinc-700";

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
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label className={labelClass} htmlFor="exerciseId">Øvelse</label>
        <select id="exerciseId" name="exerciseId" required defaultValue={state.values?.exerciseId} className={inputClass}>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </div>

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
        <p className="text-sm text-zinc-500">Pace: <span className="font-medium text-zinc-700">{pace}</span></p>
      )}

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
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
  );
}
