import type { Equipment } from "./types";

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
  const suffix = name.match(/^(.*) \((Stang|Maskine|Kabel|kabel|Kropsvægt|Andet|Dumbbells|Barbell|Machine|Cable|Bodyweight|Other)\)$/);
  if (!suffix) return englishExerciseNames[name] ?? name;
  const labels: Record<string, string> = { Stang: "Barbell", Maskine: "Machine", Kabel: "Cable", kabel: "Cable", Kropsvægt: "Bodyweight", Andet: "Other" };
  return `${englishExerciseNames[suffix[1]] ?? suffix[1]} (${labels[suffix[2]] ?? suffix[2]})`;
}
