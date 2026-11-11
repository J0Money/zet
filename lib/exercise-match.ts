import { equipmentLabel } from "./equipment";
import { englishExerciseNames, equipmentName } from "./exercise-names";
import type { Exercise, ExerciseType } from "./types";

// Finder eksisterende øvelser, der er den samme eller ligner et nyt navn, så
// "Leg Curls", "leg-curl" og "Benbøjer" ikke bliver til hver sin øvelse.

const equipmentWords = new Set(
  [...Object.values(equipmentName), ...Object.values(equipmentLabel)].map((label) => label.toLowerCase()),
);
const danishNames = new Map(Object.entries(englishExerciseNames).map(([from, to]) => [from.toLowerCase(), to]));

// Udstyr i parentes til sidst hører ikke til bevægelsens navn.
function withoutEquipment(name: string): string {
  const suffix = name.match(/^(.*\S)\s*\(([^()]+)\)$/);
  return suffix && equipmentWords.has(suffix[2].trim().toLowerCase()) ? suffix[1] : name;
}

// "curls" og "curl", "crunches" og "crunch" skal give samme ord. "press" beholdes.
function singular(word: string): string {
  if (/(ch|sh|x|ss|y)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 2 &&/[^s]s$/.test(word)) return word.slice(0, -1);
  return word;
}

function words(name: string): string[] {
  const base = withoutEquipment(name.trim()).trim().toLowerCase();
  const translated = (danishNames.get(base) ?? base).toLowerCase();
  return translated.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(singular);
}

// Samme nøgle betyder samme bevægelse: uden store bogstaver, mellemrum,
// bindestreger, flertal og udstyr, og med danske navne oversat.
export function matchKey(name: string): string {
  return words(name).join("");
}

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

export type ExerciseAlias = { alias: string; base_name: string; type: ExerciseType };

// Gamle navne fra sammenlagte øvelser: matchKey(alias) -> bevægelsens navn.
export function aliasLookup(aliases: ExerciseAlias[], type: ExerciseType): Map<string, string> {
  return new Map(aliases.filter((item) => item.type === type).map((item) => [matchKey(item.alias), item.base_name]));
}

export type ExerciseMatch = { exact: string | null; similar: string[] };

// exact er navnet på en eksisterende bevægelse med samme nøgle. similar er
// højst tre bevægelser, der ligner (stavefejl, eller alle ord går igen).
export function findExerciseMatches(
  name: string,
  type: ExerciseType,
  exercises: Exercise[],
  aliases: ExerciseAlias[] = [],
): ExerciseMatch {
  const key = matchKey(name);
  const nameWords = words(name);
  if (!key) return { exact: null, similar: [] };
  const labels = [...new Set(exercises.filter((exercise) => exercise.type === type)
    .map((exercise) => exercise.group_name ?? exercise.name))];

  let exact: string | null = null;
  const similar: { label: string; score: number }[] = [];
  for (const label of labels) {
    const other = matchKey(label);
    if (!other) continue;
    if (other === key) { exact ??= label; continue; }
    const typo = distance(key, other);
    if (typo <= (Math.min(key.length, other.length) >= 5 ? 2 : 1)) { similar.push({ label, score: typo }); continue; }
    const otherWords = words(label);
    const [few, many] = nameWords.length <= otherWords.length ? [nameWords, otherWords] : [otherWords, nameWords];
    if (few.join("").length >= 3 && few.every((word) => many.includes(word))) {
      similar.push({ label, score: 3 + many.length - few.length });
    }
  }
  // Et gammelt navn peger på den bevægelse, det blev lagt sammen i.
  exact ??= aliasLookup(aliases, type).get(key) ?? null;
  similar.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, "en"));
  return { exact, similar: similar.slice(0, 3).map((item) => item.label) };
}
