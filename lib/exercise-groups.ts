import { EQUIPMENT } from "@/lib/equipment";
import type { Equipment, Exercise } from "@/lib/types";

// Én linje i øvelseslisten. Alle varianter af samme øvelse hører til samme
// linje: de med samme group_name, og en øvelse uden gruppe (fx "Squat") hører
// til gruppen med sit eget navn, så den og en senere oprettet "Squat (Stang)"
// står under ét og samme navn.
export type ExerciseChoice = {
  key: string;
  label: string;
  variants: Exercise[];
};

export function choiceKey(exercise: Exercise): string {
  return `group:${exercise.group_name ?? exercise.name}`;
}

// Bevarer rækkefølgen, øvelserne kommer i: en gruppe står, hvor dens første
// variant står.
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
  return choices;
}

// "none" er den neutrale plads for en øvelse uden udstyr.
export type WheelKey = Equipment | "none";

// En plads på hjulet. variant er null, hvis den slet ikke findes endnu, den
// oprettes så første gang, man gemmer et sæt på den.
export type WheelOption = { key: WheelKey; equipment: Equipment | null; variant: Exercise | null };

// Alt udstyr er altid på hjulet. "Uden udstyr" er kun med, hvis øvelsen
// findes uden udstyr (fx "Squat"), ellers ville man kunne vælge noget, der
// ikke findes og ikke kan oprettes.
export function wheelOptions(choice: ExerciseChoice): WheelOption[] {
  const options: WheelOption[] = [];
  const neutral = choice.variants.find((variant) => variant.equipment === null);
  if (neutral) options.push({ key: "none", equipment: null, variant: neutral });
  for (const equipment of EQUIPMENT) {
    options.push({
      key: equipment,
      equipment,
      variant: choice.variants.find((variant) => variant.equipment === equipment) ?? null,
    });
  }
  return options;
}

// Første plads, der findes, er standardvalget for en øvelse, man ikke har valgt
// udstyr på før.
export function defaultWheelKey(options: WheelOption[]): WheelKey {
  return (options.find((option) => option.variant) ?? options[0]).key;
}
