import { ArrowLineUp, Barbell, HandGrabbing, Lightning, Mountains, PersonSimple, PersonSimpleRun, Target } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";

// Ikon og farve pr. muskelgruppe, til der kommer rigtige billeder.
const icons: Record<MuscleGroup, Icon> = {
  chest: Barbell,
  back: ArrowLineUp,
  shoulders: Mountains,
  biceps: HandGrabbing,
  triceps: Lightning,
  legs: PersonSimpleRun,
  core: Target,
  full_body: PersonSimple,
};

const tints: Record<MuscleGroup, string> = {
  chest: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
  back: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
  shoulders: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  biceps: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  triceps: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300",
  legs: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300",
  core: "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300",
  full_body: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
};

export function ExerciseCard({ label, imageSrc, muscles, lastLabel, selected, onSelect }: {
  label: string;
  // Billede af øvelsen. Mangler det, vises ikon og farve for muskelgruppen.
  imageSrc?: string;
  muscles: MuscleGroup[];
  // Fx "Sidst 3. nov", tom hvis øvelsen ikke er brugt før.
  lastLabel: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const primary = muscles[0] ?? "full_body";
  const ItemIcon = icons[primary];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-colors dark:bg-zinc-900 ${
        selected ? "border-indigo-600" : "border-zinc-200 hover:border-indigo-300 dark:border-zinc-700"
      }`}
    >
      {imageSrc ? (
        // Billederne er små WebP-filer fra vores egen rute, så next/image er ikke nødvendig.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" loading="lazy" className="h-28 w-full bg-white object-contain p-1" />
      ) : (
        <span aria-hidden="true" className={`flex h-28 items-center justify-center ${tints[primary]}`}>
          <ItemIcon size={44} weight="duotone" />
        </span>
      )}
      <span className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-50">{label}</span>
        <span className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {muscles.length > 0 ? muscles.map((group) => muscleGroupLabel[group]).join(", ") : "Ingen muskelgruppe"}
        </span>
        {lastLabel && <span className="text-xs leading-5 text-indigo-700 dark:text-indigo-300">{lastLabel}</span>}
      </span>
    </button>
  );
}
