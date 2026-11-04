// Kører én gang, når serveren starter. På Railway kører serveren hele tiden,
// så appen selv kan lukke glemte styrkepas uden en ekstern tjeneste.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Kun på Railway (variablen sættes automatisk af Railway), så lokal udvikling
  // og builds ikke starter tjekket.
  if (!process.env.RAILWAY_ENVIRONMENT_NAME) return;
  const { startWorkoutExpiryTimer } = await import("./lib/workout-expiry-timer");
  startWorkoutExpiryTimer();
}
