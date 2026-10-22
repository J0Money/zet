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
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setTab("strength")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "strength"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Styrke
        </button>
        <button
          type="button"
          onClick={() => setTab("cardio")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            tab === "cardio"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
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
