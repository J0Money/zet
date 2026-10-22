"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateDanish } from "@/lib/dates";
import { HistoryCalendar } from "@/app/components/history-calendar";
import type { WorkoutSummary } from "@/lib/workouts";

type View = "list" | "calendar";

export function HistoryView({ workoutSummaries, today }: { workoutSummaries: WorkoutSummary[]; today: string }) {
  const [view, setView] = useState<View>("list");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          Liste
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            view === "calendar"
              ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          Kalender
        </button>
      </div>

      {view === "calendar" ? (
        <HistoryCalendar workouts={workoutSummaries.map(({ workout }) => workout)} today={today} />
      ) : workoutSummaries.length === 0 ? (
        <div className="zet-panel">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen træninger logget endnu.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {workoutSummaries.map(({ workout, exerciseNames, strengthSetCount, cardioCount }) => {
            const countParts = [
              strengthSetCount > 0 ? `${strengthSetCount} sæt` : null,
              cardioCount > 0 ? `${cardioCount} cardio` : null,
            ].filter(Boolean);

            return (
              <li key={workout.id}>
                <Link
                  href={`/history/${workout.id}`}
                  className="group zet-panel block transition-colors hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600">
                      {formatDateDanish(workout.date)}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">{countParts.join(" · ")}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {exerciseNames.map((name) => (
                      <span key={name} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {name}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
