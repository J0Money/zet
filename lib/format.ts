// lib/format.ts
//
// Shared text formatting that isn't specifically about dates (that's
// lib/dates.ts). Keeps display formatting out of the pages/components that
// use it, so /log and /history/[id] can't drift into showing cardio
// differently from each other.

// Formats distance and duration for display, e.g. "5,2 km på 26 min 30 sek"
// or "0,3 km på 45 sek" (minutes omitted when there are none).
export function formatCardio(distanceKm: number, durationSec: number): string {
  const distance = distanceKm.toLocaleString("da-DK", { maximumFractionDigits: 1 });

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const duration =
    minutes > 0
      ? seconds > 0
        ? `${minutes} min ${seconds} sek`
        : `${minutes} min`
      : `${seconds} sek`;

  return `${distance} km på ${duration}`;
}
