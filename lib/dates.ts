// lib/dates.ts
//
// The server may run in UTC (e.g. on Vercel), while the app's users are in
// Denmark. Using `new Date()` + UTC-based methods directly would shift
// "today" by up to two hours around midnight Danish time. This file is the
// one place that knows about the Europe/Copenhagen timezone, everything
// else just works with plain "YYYY-MM-DD" date strings.

const COPENHAGEN_TIME_ZONE = "Europe/Copenhagen";

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
