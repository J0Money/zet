import { EQUIPMENT } from "./equipment";
import type { Equipment } from "./types";

// Side: en variant kan gælde begge sider (standard), én arm eller ét ben.
// Vægten ved én side er kg pr. hånd eller pr. ben.
export type ExerciseSide = "both" | "single_arm" | "single_leg";

export const SIDES: ExerciseSide[] = ["both", "single_arm", "single_leg"];

export const sideLabel: Record<ExerciseSide, string> = {
  both: "Begge sider",
  single_arm: "Én arm",
  single_leg: "Ét ben",
};

// Bruges i parentesen efter navnet på varianten, fx "Row (Cable, én arm)".
export const sideShortLabel: Record<Exclude<ExerciseSide, "both">, string> = {
  single_arm: "én arm",
  single_leg: "ét ben",
};

// Engelsk tekst i det gemte navn, fx "Row (Cable, Single arm)".
export const sideName: Record<Exclude<ExerciseSide, "both">, string> = {
  single_arm: "Single arm",
  single_leg: "Single leg",
};

export const weightUnit: Record<ExerciseSide, string> = {
  both: "kg",
  single_arm: "kg pr. hånd",
  single_leg: "kg pr. ben",
};

// Et valg på hjulet gemmes som tekst: "cable" (begge sider) eller
// "cable:single_arm". "none" er uden udstyr og har altid begge sider.
export function slotKey(equipment: Equipment | null, side: ExerciseSide = "both"): string {
  const base = equipment ?? "none";
  return equipment && side !== "both" ? `${base}:${side}` : base;
}

export function parseSlotKey(value: unknown): { equipment: Equipment | null; side: ExerciseSide } | null {
  if (typeof value !== "string") return null;
  const [base, side = "both", ...rest] = value.split(":");
  if (rest.length > 0 || !(SIDES as string[]).includes(side)) return null;
  if (base === "none") return side === "both" ? { equipment: null, side: "both" } : null;
  if (!(EQUIPMENT as string[]).includes(base)) return null;
  return { equipment: base as Equipment, side: side as ExerciseSide };
}
