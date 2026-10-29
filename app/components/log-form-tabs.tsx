"use client";

import { useSyncExternalStore } from "react";
import { useLocalDraft } from "@/app/components/use-local-draft";
import { draftKey } from "@/lib/log-draft";
import { CardioEntryForm } from "@/app/components/cardio-entry-form";
import { StrengthSetForm } from "@/app/components/strength-set-form";
import type { Exercise, TrainingProgram } from "@/lib/types";
import type { ExerciseHistory } from "@/lib/workouts";
import type { WheelKey } from "@/lib/exercise-groups";

type Tab = "strength" | "cardio";
const isTab = (value: unknown): value is Tab => value === "strength" || value === "cardio";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

type Props = {
  userId: string;
  strengthExercises: Exercise[];
  cardioExercises: Exercise[];
  programs: TrainingProgram[];
  exerciseHistory: Record<string, ExerciseHistory>;
  exerciseNotes: Record<string, string>;
  preferredEquipment: Record<string, WheelKey>;
};

export function LogFormTabs(props: Props) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (!ready) return <p className="text-sm text-zinc-500">Henter formular…</p>;
  return <DraftLogFormTabs key={props.userId} {...props} />;
}

function DraftLogFormTabs({
  userId,
  strengthExercises,
  cardioExercises,
  programs,
  exerciseHistory,
  exerciseNotes,
  preferredEquipment,
}: Props) {
  const { draft: tab, setDraft: setTab } = useLocalDraft<Tab>(draftKey(userId, "tab"), "strength", isTab);

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
        <div hidden={tab !== "strength"}>
          <StrengthSetForm userId={userId} exercises={strengthExercises} programs={programs} exerciseHistory={exerciseHistory} exerciseNotes={exerciseNotes} preferredEquipment={preferredEquipment} />
        </div>
        <div hidden={tab !== "cardio"}>
          <CardioEntryForm userId={userId} exercises={cardioExercises} programs={programs} />
        </div>
      </div>
    </div>
  );
}
