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

// Varigheden af et afsluttet pas, fx "1 t 9 min" eller "42 min". Under et
// minut vises "under 1 min" i stedet for 0.
export function formatWorkoutDuration(startedAt: string, endedAt: string): string {
  const totalMinutes = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  if (totalMinutes < 1) return "under 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes > 0 ? `${hours} t ${minutes} min` : `${hours} t`;
}

// Et ur, der tæller, fx "09:05" eller "1:09:05".
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Sæt samlet til en kort tekst: lige efterfølgende ens sæt slås sammen, fx
// "100 kg × 5 (3 sæt), 90 kg × 8". Vægt og reps vises med dansk talformat.
export function formatSetsSummary(sets: { reps: number; weight_kg: number }[]): string {
  const parts: string[] = [];
  for (let i = 0; i < sets.length; ) {
    let count = 1;
    while (i + count < sets.length && sets[i + count].reps === sets[i].reps && sets[i + count].weight_kg === sets[i].weight_kg) {
      count += 1;
    }
    const weight = sets[i].weight_kg.toLocaleString("da-DK", { maximumFractionDigits: 2 });
    parts.push(`${weight} kg × ${sets[i].reps}${count > 1 ? ` (${count} sæt)` : ""}`);
    i += count;
  }
  return parts.join(", ");
}
