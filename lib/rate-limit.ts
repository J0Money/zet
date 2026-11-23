import "server-only";
import { sqlClient } from "@/lib/db";

// Delt fast-vindue-tæller i samme rate_limit-tabel, som Better Auth selv
// bruger til login. Til handlinger, der ikke går gennem Better Auths handler
// (kontosletningsforsøg, kommentarer, anmodning om nulstilling af adgangskode).
// Tæller atomisk i ét statement, så samtidige kald også tælles korrekt.
export async function countRateLimitAttempt(key: string, windowMs: number): Promise<number> {
  const rows = await sqlClient.query<{ count: number }>(
    `INSERT INTO rate_limit (key, count, last_request) VALUES ($1, 1, $2::bigint)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limit.last_request < $2::bigint - $3::bigint THEN 1 ELSE rate_limit.count + 1 END,
       last_request = CASE WHEN rate_limit.last_request < $2::bigint - $3::bigint THEN $2::bigint ELSE rate_limit.last_request END
     RETURNING count`,
    [key, Date.now(), windowMs],
  );
  return Number(rows[0].count);
}

// Læser tælleren uden at tælle op. 0, hvis nøglen ikke findes, eller vinduet er udløbet.
export async function currentRateLimitCount(key: string, windowMs: number): Promise<number> {
  const rows = await sqlClient.query<{ count: number }>(
    `SELECT count FROM rate_limit WHERE key = $1 AND last_request >= $2::bigint - $3::bigint`,
    [key, Date.now(), windowMs],
  );
  return rows.length ? Number(rows[0].count) : 0;
}

export async function clearRateLimit(key: string): Promise<void> {
  await sqlClient.query(`DELETE FROM rate_limit WHERE key = $1`, [key]);
}
