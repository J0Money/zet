import { EQUIPMENT } from "@/lib/equipment";
import type { Exercise } from "@/lib/types";

// Én linje i øvelseslisten: enten en enkelt øvelse, eller en gruppe af
// varianter (fx "Bænkpres" med stang og maskine), hvor udstyret vælges på hjulet.
export type ExerciseChoice = {
  key: string;
  label: string;
  variants: Exercise[];
};

// Bevarer rækkefølgen, øvelserne kommer i: en gruppe står, hvor dens første
// variant står. Varianterne sorteres i udstyrets faste rækkefølge.
export function groupExercises(exercises: Exercise[]): ExerciseChoice[] {
  const choices: ExerciseChoice[] = [];
  const byKey = new Map<string, ExerciseChoice>();

  for (const exercise of exercises) {
    const key = choiceKey(exercise);
    const existing = byKey.get(key);
    if (existing) {
      existing.variants.push(exercise);
      continue;
    }
    const choice = { key, label: exercise.group_name ?? exercise.name, variants: [exercise] };
    byKey.set(key, choice);
    choices.push(choice);
  }

  for (const choice of choices) {
    choice.variants.sort(
      (a, b) => EQUIPMENT.indexOf(a.equipment ?? "other") - EQUIPMENT.indexOf(b.equipment ?? "other"),
    );
  }
  return choices;
}

export function choiceKey(exercise: Exercise): string {
  return exercise.group_name ? `group:${exercise.group_name}` : exercise.id;
}
