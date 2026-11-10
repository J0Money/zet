import "server-only";
import { db } from "./db";

// FORSLAG TIL FRISTER, IKKE VEDTAGET AF JOACHIM. Tallene er skøn og skal
// godkendes (eller ændres) før de nævnes i privatlivsteksten.
//
// Udløbne sessioner (IP og user agent): slettes straks. En udløbet session kan
// ikke bruges til noget, og logs over tidligere logins har ZET ikke brug for.
export const EXPIRED_SESSION_GRACE_DAYS = 0;
// Udløbne rækker i verification (nulstillingslinks og anmodninger): slettes
// straks efter udløb. Et udløbet link er ugyldigt og skal ikke gemmes.
export const EXPIRED_VERIFICATION_GRACE_DAYS = 0;
// Invitationer (indeholder en e-mailadresse): slettes 30 dage efter den
// tidligste af udløb, brug og tilbagekaldelse. Kort nok til at adressen ikke
// ligger i månedsvis, lang nok til at admin kan se, hvad der skete med en
// invitation, og at et ugyldigt link giver en forståelig fejl i en periode.
// invitation_attempt følger med via cascade.
export const FINISHED_INVITATION_RETENTION_DAYS = 30;
// Better Auths rate_limit (nøglen indeholder IP-adresser): rækker har kun
// betydning inden for vinduet (højst 60 sekunder i ZET). 1 døgn er rigelig
// margin og holder IP-adresser kort tid.
export const RATE_LIMIT_RETENTION_DAYS = 1;
// log_submission (bruger-id og engangs-id): samme regel som ved gem, hvor
// brugerens egne id'er over 3 dage slettes. Her ryddes de også for brugere,
// der ikke gemmer igen. Kladder udløber efter 2 dage, så 3 dage er sikkert.
export const LOG_SUBMISSION_RETENTION_DAYS = 3;

// Kun tal, aldrig værdier, så ingen persondata kan havne i logs.
export type RetentionCleanupResult = {
  sessions: number;
  verifications: number;
  invitations: number;
  rateLimits: number;
  logSubmissions: number;
};

// Ét samlet SQL-statement, som er atomisk og kun tager rækkelåse på de rækker,
// der slettes. Det kan køres igen uden skade: anden kørsel finder ikke mere.
// Berører aldrig bruger, account, pas, sæt, Community eller noter.
// Sessionens og verifications tidsstempler er uden tidszone og gemmes som UTC.
// invitation_attempt slettes via cascade og tælles ikke separat.
const CLEANUP_SQL = `
  WITH del_session AS (
    DELETE FROM "session"
    WHERE "expires_at" < (now() AT TIME ZONE 'UTC') - make_interval(days => $1::int)
    RETURNING 1
  ),
  del_verification AS (
    DELETE FROM "verification"
    WHERE "expires_at" < (now() AT TIME ZONE 'UTC') - make_interval(days => $2::int)
    RETURNING 1
  ),
  del_invitation AS (
    DELETE FROM "invitation"
    WHERE least(
      "expires_at",
      coalesce("used_at", 'infinity'::timestamptz),
      coalesce("revoked_at", 'infinity'::timestamptz)
    ) < now() - make_interval(days => $3::int)
    RETURNING 1
  ),
  del_rate_limit AS (
    DELETE FROM "rate_limit"
    WHERE "last_request" < (extract(epoch FROM now()) * 1000)::bigint - ($4::int * 86400000::bigint)
    RETURNING 1
  ),
  del_log_submission AS (
    DELETE FROM "log_submission"
    WHERE "created_at" < now() - make_interval(days => $5::int)
    RETURNING 1
  )
  SELECT
    (SELECT count(*) FROM del_session)::int AS sessions,
    (SELECT count(*) FROM del_verification)::int AS verifications,
    (SELECT count(*) FROM del_invitation)::int AS invitations,
    (SELECT count(*) FROM del_rate_limit)::int AS rate_limits,
    (SELECT count(*) FROM del_log_submission)::int AS log_submissions
`;

export async function runRetentionCleanup(): Promise<RetentionCleanupResult> {
  const rows = (await db.$client.query(CLEANUP_SQL, [
    EXPIRED_SESSION_GRACE_DAYS,
    EXPIRED_VERIFICATION_GRACE_DAYS,
    FINISHED_INVITATION_RETENTION_DAYS,
    RATE_LIMIT_RETENTION_DAYS,
    LOG_SUBMISSION_RETENTION_DAYS,
  ])) as Record<string, number>[];
  const row = rows[0];
  return {
    sessions: Number(row.sessions),
    verifications: Number(row.verifications),
    invitations: Number(row.invitations),
    rateLimits: Number(row.rate_limits),
    logSubmissions: Number(row.log_submissions),
  };
}
