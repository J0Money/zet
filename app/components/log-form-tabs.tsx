"use client";

import { useState } from "react";
import { CardioEntryForm } from "@/app/components/cardio-entry-form";
import { StrengthSetForm } from "@/app/components/strength-set-form";
import type { Exercise } from "@/lib/types";

type Tab = "strength" | "cardio";

export function LogFormTabs({
  strengthExercises,
  cardioExercises,
}: {
  strengthExercises: Exercise[];
  cardioExercises: Exercise[];
}) {
  const [tab, setTab] = useState<Tab>("strength");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("strength")}
          className={`flex-1 rounded p-2 text-sm font-medium ${
            tab === "strength"
              ? "bg-foreground text-background"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Styrke
        </button>
        <button
          type="button"
          onClick={() => setTab("cardio")}
          className={`flex-1 rounded p-2 text-sm font-medium ${
            tab === "cardio"
              ? "bg-foreground text-background"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Cardio
        </button>
      </div>

      {tab === "strength" ? (
        <StrengthSetForm exercises={strengthExercises} />
      ) : (
        <CardioEntryForm exercises={cardioExercises} />
      )}
    </div>
  );
}
