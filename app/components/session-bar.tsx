"use client";

import { useSyncExternalStore } from "react";
import { endWorkoutAction, startWorkoutAction } from "@/app/log/session-actions";
import { formatTimeDanish } from "@/lib/dates";
import { formatClock } from "@/lib/format";

// Et ur, der opdateres hvert sekund. useSyncExternalStore er Reacts måde at
// læse noget uden for React (her klokken) uden en effect med setState:
// serversnapshottet er null, så første visning ikke afhænger af, hvad klokken
// er, og dermed ikke giver en uoverensstemmelse mellem server og browser.
function subscribeToClock(onChange: () => void) {
  const interval = setInterval(onChange, 1000);
  return () => clearInterval(interval);
}

function useElapsedSeconds(startedAt: string): number | null {
  const now = useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );
  return now === null ? null : now - Math.floor(new Date(startedAt).getTime() / 1000);
}

function ActiveSession({ startedAt }: { startedAt: string }) {
  const elapsed = useElapsedSeconds(startedAt);
  // Sticky: linjen bliver stående øverst, mens man scroller ned til formularen
  // og sættene, så uret altid kan ses. Toppen tager højde for udskæringen på
  // telefoner (safe-area), når appen er installeret på hjemmeskærmen.
  return (
    <div className="zet-panel sticky top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex items-center justify-between gap-3 shadow-sm">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Træning i gang</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Startet kl. {formatTimeDanish(startedAt)}</p>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums text-indigo-600 dark:text-indigo-400" aria-label="Tid siden start">
        {elapsed === null ? "--:--" : formatClock(elapsed)}
      </p>
      <form
        action={endWorkoutAction}
        onSubmit={(event) => {
          if (!window.confirm("Vil du afslutte træningen? Vælg Annuller for at fortsætte.")) {
            event.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="min-h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400"
        >
          Afslut
        </button>
      </form>
    </div>
  );
}

export function SessionBar({ startedAt }: { startedAt: string | null }) {
  if (startedAt) return <ActiveSession startedAt={startedAt} />;
  return (
    <div className="zet-panel flex items-center justify-between gap-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen træning i gang. Log et sæt, så starter den af sig selv.</p>
      <form action={startWorkoutAction}>
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Start træning
        </button>
      </form>
    </div>
  );
}
