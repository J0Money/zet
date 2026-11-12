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

// Greb på kabeltårnet. Kun kabeløvelser har greb, og det er valgfrit: null
// betyder "ikke angivet". Hvert greb er sin egen variant med egen rekord.
export type CableGrip = "rope" | "straight_bar" | "ez_bar" | "wide_bar" | "v_grip" | "single_handle" | "two_handles" | "no_grip";

export const GRIPS: CableGrip[] = ["rope", "straight_bar", "ez_bar", "wide_bar", "v_grip", "single_handle", "two_handles", "no_grip"];

export const gripLabel: Record<CableGrip, string> = {
  rope: "Reb",
  straight_bar: "Lige stang",
  ez_bar: "EZ-stang",
  wide_bar: "Bred stang",
  v_grip: "V-greb",
  single_handle: "Enkelt håndtag",
  two_handles: "To håndtag",
  no_grip: "Uden greb",
};

// Engelsk tekst i det gemte navn, fx "Triceps pushdown (Cable, Rope)".
export const gripName: Record<CableGrip, string> = {
  rope: "Rope",
  straight_bar: "Straight bar",
  ez_bar: "EZ bar",
  wide_bar: "Wide bar",
  v_grip: "V grip",
  single_handle: "Single handle",
  two_handles: "Two handles",
  no_grip: "No grip",
};

export type Slot = { equipment: Equipment | null; side: ExerciseSide; grip: CableGrip | null };

// Et valg på hjulet gemmes som tekst: "cable" (begge sider), "cable:single_arm"
// eller med greb "cable:both:rope". "none" er uden udstyr og har altid begge
// sider. Greb findes kun på kabel.
export function slotKey(equipment: Equipment | null, side: ExerciseSide = "both", grip: CableGrip | null = null): string {
  const base = equipment ?? "none";
  if (equipment === "cable" && grip) return `${base}:${side}:${grip}`;
  return equipment && side !== "both" ? `${base}:${side}` : base;
}

export function parseSlotKey(value: unknown): Slot | null {
  if (typeof value !== "string") return null;
  const [base, side = "both", grip, ...rest] = value.split(":");
  if (rest.length > 0 || !(SIDES as string[]).includes(side)) return null;
  if (grip !== undefined && (base !== "cable" || !(GRIPS as string[]).includes(grip))) return null;
  if (base === "none") return side === "both" ? { equipment: null, side: "both", grip: null } : null;
  if (!(EQUIPMENT as string[]).includes(base)) return null;
  return { equipment: base as Equipment, side: side as ExerciseSide, grip: (grip as CableGrip | undefined) ?? null };
}
