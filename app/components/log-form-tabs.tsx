"use client";

import { useState } from "react";
import { CardioEntryForm } from "@/app/components/cardio-entry-form";
import { StrengthSetForm } from "@/app/components/strength-set-form";
import type { Exercise, TrainingProgram } from "@/lib/types";

type Tab = "strength" | "cardio";

export function LogFormTabs({
  strengthExercises,
  cardioExercises,
  programs,
}: {
  strengthExercises: Exercise[];
  cardioExercises: Exercise[];
  programs: TrainingProgram[];
}) {
  const [tab, setTab] = useState<Tab>("strength");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
        <button
          type="button"
          onClick={() => setTab("strength")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "strength"
              ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          Styrke
        </button>
        <button
          type="button"
          onClick={() => setTab("cardio")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "cardio"
              ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          Cardio
        </button>
      </div>

      <div className="zet-panel">
        {tab === "strength" ? (
          <StrengthSetForm exercises={strengthExercises} programs={programs} />
        ) : (
          <CardioEntryForm exercises={cardioExercises} programs={programs} />
        )}
      </div>
    </div>
  );
}
