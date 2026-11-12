import type { Equipment } from "./types";
import { equipmentLabel } from "./equipment";
import { GRIPS, gripLabel, gripName, sideName, sideShortLabel, type CableGrip, type ExerciseSide } from "./exercise-side";

// Grebets engelske navn i et gemt navn, fx ", Rope" i "Curl (Cable, Rope)".
const GRIP_PATTERN = GRIPS.map((grip) => gripName[grip]).join("|");

export const equipmentName: Record<Equipment, string> = {
  barbell: "Barbell", dumbbells: "Dumbbells", machine: "Machine", cable: "Cable", bodyweight: "Bodyweight", other: "Other",
};
export const englishExerciseNames: Record<string, string> = {
  "Flue smækkeren": "Pec deck fly", "Motor cyklen": "Prone Row",
  "Lying chest-supported machine row": "Prone Row",
  "Bænkpres": "Bench press", "Skråbænkpres": "Incline bench press", "Skulderpres": "Shoulder press",
  "Dødløft": "Deadlift", "Lat-træk": "Lat pulldown", "Ro": "Row", "Ro i maskine": "Machine row",
  "Stående ro i kabel": "Standing cable row", "Brystpres i maskine": "Machine chest press",
  "Rygstrækninger": "Back extension", "Sidehævninger": "Lateral raise", "Frontløft": "Front raise",
  "Omvendt flyes": "Reverse fly", "Skuldertræk": "Shrugs", "Koncentrationscurl": "Concentration curl",
  "Fransk pres": "French press", "Udfald": "Lunges", "Benpres": "Leg press", "Benstrækker": "Leg extension",
  "Benbøjer": "Leg curl", "Vadebøjninger": "Calf raise", "Planke": "Plank", "Mavebøjninger": "Sit-ups",
  "Hængende benløft": "Hanging leg raise", "Løb": "Running", "Cykling": "Cycling", "Romaskine": "Rowing machine",
  "Svømning": "Swimming", "Trappemaskine": "Stair climber", "Hop i reb": "Jump rope",
};
export function englishExerciseName(name: string): string {
  const suffix = name.match(new RegExp(`^(.*) \\((Stang|Maskine|Kabel|kabel|Kropsvægt|Andet|Dumbbells|Barbell|Machine|Cable|Bodyweight|Other)((?:, (?:${GRIP_PATTERN}))?(?:, Single arm|, Single leg)?)\\)$`));
  if (!suffix) return englishExerciseNames[name] ?? name;
  const labels: Record<string, string> = { Stang: "Barbell", Maskine: "Machine", Kabel: "Cable", kabel: "Cable", Kropsvægt: "Bodyweight", Andet: "Other" };
  return `${englishExerciseNames[suffix[1]] ?? suffix[1]} (${labels[suffix[2]] ?? suffix[2]}${suffix[3] ?? ""})`;
}

// Navnet på en variant: "Row", "Row (Cable)", "Row (Cable, Single arm)" eller
// med greb "Row (Cable, Single handle, Single arm)". Uden udstyr er navnet bare
// gruppen. Greb kommer kun med på kabel.
export function variantName(group: string, equipment: Equipment | null, side: ExerciseSide = "both", grip: CableGrip | null = null): string {
  if (!equipment) return group;
  const gripPart = equipment === "cable" && grip ? `, ${gripName[grip]}` : "";
  return `${group} (${equipmentName[equipment]}${gripPart}${side === "both" ? "" : `, ${sideName[side]}`})`;
}

// Exercise names stay English; equipment follows the Danish selectors.
export function displayExerciseName(name: string): string {
  const translated = englishExerciseName(name);
  const match = translated.match(new RegExp(`^(.*) \\(([^(),]+)(?:, (${GRIP_PATTERN}))?(?:, (Single arm|Single leg))?\\)$`));
  if (!match) return translated;
  const equipment = (Object.keys(equipmentName) as Equipment[]).find((key) => equipmentName[key] === match[2]);
  if (!equipment) return translated;
  const grip = match[3] ? GRIPS.find((key) => gripName[key] === match[3]) : undefined;
  const side = match[4] === "Single arm" ? sideShortLabel.single_arm : match[4] === "Single leg" ? sideShortLabel.single_leg : null;
  return `${match[1]} (${equipmentLabel[equipment]}${grip ? `, ${gripLabel[grip].toLowerCase()}` : ""}${side ? `, ${side}` : ""})`;
}
