import { closeAllExpiredStrengthWorkouts } from "./workout-expiry";

const INTERVAL_MS = 10 * 60 * 1000;

// Lukker styrkepas uden nye sæt i en time, hvert 10. minut. Sluttiden er
// stadig sidste sæt, så et sent tjek ændrer ikke resultatet.
export function startWorkoutExpiryTimer(): void {
  const run = () => {
    closeAllExpiredStrengthWorkouts().catch(() => {
      // Rå databasefejl logges ikke, da de kan indeholde parametre.
      console.error("Automatisk afslutning af pas fejlede. Prøver igen om 10 minutter.");
    });
  };
  run();
  setInterval(run, INTERVAL_MS).unref();
}
