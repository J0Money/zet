import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { account, user } from "@/lib/db/schema";
import { ownedAvatarKey } from "@/lib/avatar-image";
import { avatarStorageConfigured, deleteAvatarObject, deleteAvatarObjectsFor } from "@/lib/avatar-storage";
import { countRateLimitAttempt } from "@/lib/rate-limit";

// Kontosletning (punkt 12 i docs/privacy-readiness.md). Brugeren bekræfter med
// adgangskoden, og alt, der hører til brugeren, slettes i ÉN databasetransaktion.
// Neons HTTP-driver har ingen interaktive transaktioner, så sletningen er en
// ikke-interaktiv batch (BEGIN ... COMMIT): alle trin lykkes, eller ingen gør.
// Profilbilledet ligger uden for databasen og slettes bagefter.

export type DeleteAccountResult =
  | { success: true }
  | { success: false; code: "wrong_password" | "rate_limited" | "last_admin" | "no_password" | "not_found" | "failed"; message: string };

// Forsøg på at bekræfte med adgangskode tælles pr. bruger i Better Auths
// tabel rate_limit (egen nøgle), så en stjålet session ikke kan gætte koden.
export const DELETE_ATTEMPT_LIMIT = 5;
export const DELETE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const attemptKey = (userId: string) => `delete-account:${userId}`;

const messages = {
  wrong_password: "Adgangskoden er forkert. Din konto er ikke slettet.",
  rate_limited: "For mange forsøg. Vent 10 minutter, og prøv igen.",
  last_admin: "Du er den sidste administrator. Gør en anden bruger til administrator, før du sletter din konto.",
  no_password: "Din konto har ingen adgangskode, så den kan ikke slettes her. Kontakt administratoren.",
  not_found: "Kontoen findes ikke længere.",
  failed: "Kontoen kunne ikke slettes lige nu. Der er ikke slettet noget. Prøv igen om lidt.",
} as const;
const fail = (code: keyof typeof messages): DeleteAccountResult => ({ success: false, code, message: messages[code] });

// Tæller forsøget atomisk, før adgangskoden kontrolleres, så samtidige gæt
// også tælles. Fast vindue fra det første forsøg. Delt mønster i lib/rate-limit.ts.
async function countAttempt(userId: string): Promise<number> {
  return countRateLimitAttempt(attemptKey(userId), DELETE_ATTEMPT_WINDOW_MS);
}

// Alle trin kører i rækkefølge i samme transaktion. Senere trin ser tidligere
// trins sletninger, og det bruges bevidst (se øvelser nedenfor).
// Eksporteret, så integrationstesten kan køre vagten i en transaktion, der altid rulles tilbage.
export function buildDeletionStatements(userId: string) {
  const q = (text: string, params: unknown[] = [userId]) => db.$client.query(text, params);
  return [
    q("SET LOCAL lock_timeout = '5s'", []),
    // Gemmer bruger-id i transaktionen, så vagten nedenfor kan bruge det uden at skrive id'et ind i SQL.
    q("SELECT set_config('zet.delete_user', $1, true)"),
    // Sidste admin: rækkerne låses, så to admins ikke kan slette sig samtidig og efterlade ingen.
    q(`DO $$
       DECLARE uid uuid := current_setting('zet.delete_user')::uuid;
       BEGIN
         PERFORM 1 FROM "user" WHERE role = 'admin' FOR UPDATE;
         IF (SELECT role FROM "user" WHERE id = uid) = 'admin'
            AND (SELECT count(*) FROM "user" WHERE role = 'admin' AND id <> uid) = 0 THEN
           RAISE EXCEPTION 'ZET_LAST_ADMIN';
         END IF;
       END $$`, []),
    // Community: egne reaktioner og kommentarer på andres opslag, derefter egne opslag
    // (andres reaktioner og kommentarer på mine opslag følger med via cascade).
    q(`DELETE FROM community_reaction WHERE user_id = $1::uuid`),
    q(`DELETE FROM community_comment WHERE user_id = $1::uuid`),
    q(`DELETE FROM community_post WHERE user_id = $1::uuid`),
    q(`DELETE FROM push_subscription WHERE user_id = $1::uuid`),
    q(`DELETE FROM log_submission WHERE user_id = $1::uuid`),
    q(`DELETE FROM exercise_note WHERE user_id = $1::uuid`),
    // Pas (sæt og cardio følger med via cascade) og programmer (øvelseslister via cascade).
    q(`DELETE FROM workout WHERE user_id = $1::uuid`),
    q(`DELETE FROM training_program WHERE user_id = $1::uuid`),
    // Øvelser: på dette tidspunkt er alle MINE sæt, cardio, programlinjer og noter slettet,
    // så det, der stadig refererer en af mine øvelser, tilhører andre brugere. Dem beholdes
    // uden ejer (user_id null, synlig for alle som de indbyggede). Resten slettes
    // (muskelgrupper følger med via cascade).
    q(`UPDATE exercise e SET user_id = NULL
       WHERE e.user_id = $1::uuid AND (
         EXISTS (SELECT 1 FROM workout_set s WHERE s.exercise_id = e.id)
         OR EXISTS (SELECT 1 FROM workout_cardio c WHERE c.exercise_id = e.id)
         OR EXISTS (SELECT 1 FROM training_program_exercise p WHERE p.exercise_id = e.id)
         OR EXISTS (SELECT 1 FROM exercise_note n WHERE n.exercise_id = e.id))`),
    q(`DELETE FROM exercise WHERE user_id = $1::uuid`),
    // Nulstillingsanmodninger og -links (verification.value er bruger-id'et) og invitationer på samme e-mail
    // (forsøgstælleren følger med via cascade). Skal ske før brugeren, som e-mailen slås op på.
    q(`DELETE FROM verification WHERE value = $1`),
    q(`DELETE FROM invitation WHERE lower(email) = (SELECT lower(email) FROM "user" WHERE id = $1::uuid)`),
    q(`DELETE FROM rate_limit WHERE key = $1`, [attemptKey(userId)]),
    q(`DELETE FROM session WHERE user_id = $1::uuid`),
    q(`DELETE FROM account WHERE user_id = $1::uuid`),
    q(`DELETE FROM "user" WHERE id = $1::uuid RETURNING id`),
  ];
}

export async function deleteAccount(userId: string, password: unknown): Promise<DeleteAccountResult> {
  if (typeof password !== "string" || !password || password.length > 128) return fail("wrong_password");
  try {
    if (await countAttempt(userId) > DELETE_ATTEMPT_LIMIT) return fail("rate_limited");
    const [found] = await db.select({ hash: account.password, image: user.image }).from(user)
      .leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential"), isNotNull(account.password)))
      .where(eq(user.id, userId)).limit(1);
    if (!found) return fail("not_found");
    if (!found.hash) return fail("no_password");
    if (!await verifyPassword({ hash: found.hash, password })) return fail("wrong_password");

    let results: unknown[];
    try {
      results = await db.$client.transaction(buildDeletionStatements(userId));
    } catch (error) {
      if (error instanceof Error && error.message.includes("ZET_LAST_ADMIN")) return fail("last_admin");
      console.error("Kontosletning mislykkedes og er rullet tilbage."); // Bevidst uden fejlindhold og id'er.
      return fail("failed");
    }
    const deleted = results[results.length - 1] as unknown[];
    if (!deleted.length) return fail("not_found");

    // Efter databasen: billedet kan ikke være i transaktionen. En fejl her fejler ikke sletningen.
    await removeAvatars(userId, found.image);
    return { success: true };
  } catch {
    console.error("Kontosletning kunne ikke gennemføres.");
    return fail("failed");
  }
}

async function removeAvatars(userId: string, image: string | null) {
  if (!avatarStorageConfigured()) return;
  try {
    if (ownedAvatarKey(image, userId)) await deleteAvatarObject(image!);
    // Ældre billeder, hvis oprydning engang fejlede, ligger under samme præfiks.
    await deleteAvatarObjectsFor(userId);
  } catch {
    console.warn("Profilbilledet kunne ikke slettes fra billedlageret ved kontosletning.");
  }
}
