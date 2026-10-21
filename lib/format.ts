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

// Formats pace som "4:32 /km". Returnerer null, hvis distance eller varighed
// ikke er et positivt tal, pacen giver ingen mening ved 0 km eller 0 sekunder.
export function formatPace(distanceKm: number, durationSec: number): string | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
    return null;
  }
  const paceSecPerKm = durationSec / distanceKm;
  const minutes = Math.floor(paceSecPerKm / 60);
  const seconds = Math.round(paceSecPerKm % 60);
  // Afrunding kan give 60 sekunder, det skal rykkes over i et helt minut.
  const roundedUp = seconds === 60;
  return `${roundedUp ? minutes + 1 : minutes}:${String(roundedUp ? 0 : seconds).padStart(2, "0")} /km`;
}
