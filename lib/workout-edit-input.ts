import type { Entry, Equipment, Workout } from "./types";
import { EQUIPMENT } from "./equipment";

export class WorkoutEditError extends Error {}

export function localWorkoutTime(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  return parts.replace(" ", "T");
}

// Find the actual instant in Copenhagen, including daylight-saving boundaries.
export function parseWorkoutTime(value: string, original: string | null): string | null {
  if (!value) return null;
  const normalized = value.length === 16 ? `${value}:00` : value;
  if (original && localWorkoutTime(original) === normalized) return original;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) throw new WorkoutEditError("Ugyldigt tidspunkt.");
  const naive = Date.parse(`${normalized}Z`);
  const candidates = [1, 2].map((offset) => new Date(naive - offset * 3600000)).filter((date) => Number.isFinite(date.getTime()) && localWorkoutTime(date.toISOString()) === normalized);
  if (candidates.length !== 1) throw new WorkoutEditError("Tidspunktet findes ikke eller er tvetydigt ved skift mellem sommer- og vintertid. Vælg et andet tidspunkt.");
  return candidates[0].toISOString();
}

export type EditEntry = Entry & { equipment?: Equipment | "none" };
export type WorkoutEdit = { date: string; start: string; end: string; notes: string; entries: EditEntry[] };
export function validateWorkoutEdit(input: WorkoutEdit, original: Workout) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new WorkoutEditError("Vælg en gyldig dato.");
  if (typeof input.notes !== "string" || input.notes.length > 5000) throw new WorkoutEditError("Noten må højst være 5000 tegn.");
  const start = parseWorkoutTime(input.start, original.started_at);
  const end = parseWorkoutTime(input.end, original.ended_at);
  if (end && !start) throw new WorkoutEditError("Angiv også et starttidspunkt.");
  if (start && localWorkoutTime(start).slice(0, 10) !== input.date) throw new WorkoutEditError("Datoen skal være samme dag som starttidspunktet.");
  if (start && end && Date.parse(end) <= Date.parse(start)) throw new WorkoutEditError("Slut skal være efter start.");
  if (start && !end && !(original.started_at && !original.ended_at)) throw new WorkoutEditError("Angiv både start og slut for et afsluttet pas.");
  if (original.started_at && !original.ended_at && !start) throw new WorkoutEditError("Et igangværende pas skal have et starttidspunkt.");
  if (!Array.isArray(input.entries) || input.entries.length > 500) throw new WorkoutEditError("Der kan højst gemmes 500 registreringer.");
  const ids = new Set<string>();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const entry of input.entries) {
    if (entry.equipment !== undefined && entry.equipment !== "none" && !EQUIPMENT.includes(entry.equipment)) throw new WorkoutEditError("Ugyldigt udstyr.");
    if (!uuid.test(entry.id) || !uuid.test(entry.exercise_id) || ids.has(entry.id)) throw new WorkoutEditError("Ugyldig registrering.");
    ids.add(entry.id);
    if (entry.kind === "strength") {
      if (!Number.isInteger(entry.reps) || entry.reps < 1 || entry.reps > 10000 || !Number.isFinite(entry.weight_kg) || entry.weight_kg < 0 || entry.weight_kg > 100000) throw new WorkoutEditError("Kontrollér kg og gentagelser.");
    } else if (entry.kind === "cardio") {
      if (!Number.isFinite(entry.distance_km) || entry.distance_km <= 0 || entry.distance_km > 100000 || !Number.isInteger(entry.duration_sec) || entry.duration_sec <= 0 || entry.duration_sec > 31536000) throw new WorkoutEditError("Kontrollér distance og varighed.");
    } else throw new WorkoutEditError("Ugyldig registreringstype.");
  }
  return { start, end };
}
