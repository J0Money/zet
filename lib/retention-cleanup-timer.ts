import { runRetentionCleanup } from "./retention-cleanup";

const INTERVAL_MS = 24 * 60 * 60 * 1000;

// Rydder udløbne og forældede data ved opstart og derefter ca. hver 24. time.
// Logger kun antal slettede rækker pr. tabel, aldrig værdier.
export function startRetentionCleanupTimer(): void {
  const run = () => {
    runRetentionCleanup()
      .then((result) => {
        console.log(
          `Oprydning: ${result.sessions} sessioner, ${result.verifications} nulstillingsrækker, ${result.invitations} invitationer, ${result.rateLimits} rate-limit-rækker, ${result.logSubmissions} gem-id'er slettet.`,
        );
      })
      .catch(() => {
        // Rå databasefejl logges ikke, da de kan indeholde parametre.
        console.error("Oprydning af udløbne data fejlede. Prøver igen om 24 timer.");
      });
  };
  run();
  setInterval(run, INTERVAL_MS).unref();
}
