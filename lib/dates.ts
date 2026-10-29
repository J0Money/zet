// lib/dates.ts
//
// The server may run in UTC (e.g. on Vercel), while the app's users are in
// Denmark. Using `new Date()` + UTC-based methods directly would shift
// "today" by up to two hours around midnight Danish time. This file is the
// one place that knows about the Europe/Copenhagen timezone, everything
// else just works with plain "YYYY-MM-DD" date strings.

const COPENHAGEN_TIME_ZONE = "Europe/Copenhagen";

// ISO-ugen tilhører året, som dens torsdag ligger i.
export function getISOWeek(date: string): { week: number; year: number } {
  const thursday = new Date(date);
  thursday.setUTCDate(thursday.getUTCDate() + 3 - (thursday.getUTCDay() + 6) % 7);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { week, year };
}

export function formatWeekDanish(date: string): string {
  const { week, year } = getISOWeek(date);
  return `Uge ${week} · ${year}`;
}

// Today's date as "YYYY-MM-DD", using Danish wall-clock time.
export function getTodayInCopenhagen(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: COPENHAGEN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Formats an already-stored "YYYY-MM-DD" date for display, e.g. "13. okt. 2026".
// Deliberately pinned to UTC, not Europe/Copenhagen: the string is a plain
// calendar date with no timezone of its own (it was already the correct
// Danish date when it was saved, via getTodayInCopenhagen). Parsing it as
// UTC midnight and formatting with timeZone "UTC" just echoes back that same
// calendar day, formatting it with the real Copenhagen zone instead could
// shift it a day depending on where the code happens to run.
export function formatDateDanish(date: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Som formatDateDanish, men uden årstal, fx "13. okt". Til steder med lidt
// plads, som diagram-akser, hvor årstallet sjældent er nødvendigt.
export function formatShortDateDanish(date: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

// Alder i fyldte år ud fra en "YYYY-MM-DD"-fødselsdato, regnet mod dags dato
// i dansk tid. Bruges til aldersgrænsen ved oprettelse (lib/invitations.ts)
// og til at vise/skjule voksenbekræftelsen i signup-formularen.
export function calculateAge(birthDate: string): number {
  const today = getTodayInCopenhagen().split("-").map(Number);
  const birth = birthDate.split("-").map(Number);
  let age = today[0] - birth[0];
  if (today[1] < birth[1] || (today[1] === birth[1] && today[2] < birth[2])) {
    age--;
  }
  return age;
}

// Klokkeslæt i dansk tid for et gemt tidspunkt (ISO), fx "18.42". Her bruges
// Europe/Copenhagen med vilje, i modsætning til formatDateDanish: et
// tidspunkt er et ægte øjeblik, ikke en kalenderdato uden tidszone.
export function formatTimeDanish(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: COPENHAGEN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
