// Ingen database- eller brugerdata ud over det tilfældige pas-id sendes.
export async function publishWorkoutExpiry(
  workoutId: string,
  notBefore: number,
  config: { token: string; secret: string; callbackUrl: string },
  send: typeof fetch = fetch,
): Promise<void> {
  const url = new URL(config.callbackUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Ugyldig callback-adresse.");
  }
  if (!config.token || !config.secret || !Number.isSafeInteger(notBefore)) throw new Error("Ufuldstændig opsætning.");
  // Gentagelse af publicering med samme deadline skaber ikke dubletter.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await send(`https://qstash.upstash.io/v2/publish/${url.href}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
          "Upstash-Forward-Authorization": `Bearer ${config.secret}`,
          "Upstash-Not-Before": String(notBefore),
          "Upstash-Deduplication-Id": `workout-${workoutId}-${notBefore}`,
          "Upstash-Retries": "3",
        },
        body: JSON.stringify({ workoutId }),
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      });
      if (response.ok) return;
    } catch { /* Fejlsvar kan indeholde hemmeligheder og må ikke logges. */ }
  }
  throw new Error("Afslutningen kunne ikke planlægges.");
}
