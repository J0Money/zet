import type { Equipment } from "@/lib/types";

// Fast rækkefølge og danske navne, samme mønster som lib/muscle-groups.ts.
export const EQUIPMENT: Equipment[] = ["barbell", "dumbbells", "machine", "cable", "bodyweight", "other"];

export const equipmentLabel: Record<Equipment, string> = {
  barbell: "Stang",
  dumbbells: "Dumbbells",
  machine: "Maskine",
  cable: "Kabel",
  bodyweight: "Kropsvægt",
  other: "Andet",
};
