import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitation, user } from "@/lib/db/schema";

type InvitationErrorCode =
  | "INVALID_INPUT"
  | "INVALID_INVITATION"
  | "EMAIL_IN_USE"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

export type AcceptInvitationResult =
  | { success: true; userId: string; email: string }
  | { success: false; code: InvitationErrorCode; message: string };

const invalidInvitation: AcceptInvitationResult = {
  success: false,
  code: "INVALID_INVITATION",
  message: "Invitationen er ugyldig, udløbet eller allerede brugt.",
};

export type InvitationDetails =
  | { status: "valid"; email: string }
  | { status: "invalid" | "unavailable" };

// Et besøg må aldrig forbruge invitationen. Kun de nødvendige oplysninger
// sendes til formularen; databaserækken og hashet bliver på serveren.
export async function getInvitationDetails(token: unknown): Promise<InvitationDetails> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { status: "invalid" };
  }
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [row] = await db.select({ email: invitation.email }).from(invitation)
      .where(and(
        eq(invitation.tokenHash, tokenHash),
        isNull(invitation.usedAt),
        isNull(invitation.revokedAt),
        gt(invitation.expiresAt, sql`clock_timestamp()`),
      )).limit(1);
    return row
      ? { status: "valid", email: row.email.trim().toLowerCase() }
      : { status: "invalid" };
  } catch {
    return { status: "unavailable" };
  }
}

// Drizzle kan pakke databasefejlen ind i cause. Undlad at logge fejlen:
// den kan indeholde SQL-parametre med personoplysninger og adgangskodehash.
function isEmailConflict(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5; depth++) {
    if (!current || typeof current !== "object") return false;
    const detail = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (
      detail.code === "23505" &&
      detail.constraint === "user_email_unique"
    ) {
      return true;
    }
    current = detail.cause;
  }
  return false;
}

// Dette er et internt servermodul, ikke en offentlig Server Action.
// Tælleren begrænser hashing til fem forsøg pr. gyldig invitation pr.
// 15 minutter. E-mailen kommer altid fra invitationen.
export async function acceptInvitation(
  input: unknown,
): Promise<AcceptInvitationResult> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "Udfyld navn og adgangskode.",
    };
  }

  const { token, name, password } = input as Record<string, unknown>;
  // Linkgeneratoren skal bruge randomBytes(32).toString("hex").
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return invalidInvitation;
  }
  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 100
  ) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "Navnet skal være mellem 1 og 100 tegn.",
    };
  }

  const minLength = auth.options.emailAndPassword.minPasswordLength;
  const maxLength = auth.options.emailAndPassword.maxPasswordLength;
  // Adgangskoder trimmes ikke; mellemrum kan være en del af adgangskoden.
  if (
    typeof password !== "string" ||
    password.length < minLength ||
    password.length > maxLength
  ) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: `Adgangskoden skal være mellem ${minLength} og ${maxLength} tegn.`,
    };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    // Et billigt opslag afviser ukendte links før adgangskodehashing.
    // Det er kun en optimering: alle betingelser kontrolleres igen i UPDATE.
    const [available] = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.tokenHash, tokenHash),
          isNull(invitation.usedAt),
          isNull(invitation.revokedAt),
          gt(invitation.expiresAt, sql`clock_timestamp()`),
        ),
      )
      .limit(1);
    if (!available) return invalidInvitation;

    // Atomisk upsert: samtidige forespørgsler deler samme tæller i Neon.
    // Tælleren gemmes særskilt, så et mislykket oprettelsesforsøg stadig tæller.
    // Et udløbet tidsvindue genbruges; ukendte koder opretter ingen rækker.
    const attempt = await db.execute<{ invitation_id: string }>(sql`
      INSERT INTO "invitation_attempt"
        ("invitation_id", "attempts", "window_ends_at")
      VALUES (${available.id}::uuid, 1, clock_timestamp() + interval '15 minutes')
      ON CONFLICT ("invitation_id") DO UPDATE SET
        "attempts" = CASE
          WHEN "invitation_attempt"."window_ends_at" <= clock_timestamp()
          THEN 1 ELSE "invitation_attempt"."attempts" + 1 END,
        "window_ends_at" = CASE
          WHEN "invitation_attempt"."window_ends_at" <= clock_timestamp()
          THEN clock_timestamp() + interval '15 minutes'
          ELSE "invitation_attempt"."window_ends_at" END
      WHERE "invitation_attempt"."window_ends_at" <= clock_timestamp()
         OR "invitation_attempt"."attempts" < 5
      RETURNING "invitation_id"
    `);
    if (!attempt.rows.length) {
      return {
        success: false,
        code: "RATE_LIMITED",
        message: "Der har været for mange forsøg med dette link. Vent 15 minutter, og prøv igen.",
      };
    }

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();
    const accountId = randomUUID();

    // Én SQL-sætning er atomisk, også med neon-http. UPDATE låser invitationen
    // og kontrollerer used_at igen, hvis et andet forsøg allerede har brugt den.
    // RETURNING forbinder trinene: ingen gyldig invitation betyder ingen bruger
    // eller konto. En fejl i et INSERT ruller også UPDATE tilbage.
    // Brug ikke ON CONFLICT DO NOTHING: det kunne forbruge linket uden en konto.
    const result = await db.execute<{ id: string; email: string }>(sql`
      WITH claimed_invitation AS (
        UPDATE "invitation"
        SET "used_at" = clock_timestamp()
        WHERE "token_hash" = ${tokenHash}
          AND "used_at" IS NULL
          AND "revoked_at" IS NULL
          AND "expires_at" > clock_timestamp()
        RETURNING lower(btrim("email")) AS "email"
      ),
      created_user AS (
        INSERT INTO "user"
          ("id", "email", "name", "email_verified", "created_at", "updated_at")
        SELECT ${userId}::uuid, "email", ${name.trim()}, false, now(), now()
        FROM claimed_invitation
        RETURNING "id", "email"
      ),
      created_account AS (
        INSERT INTO "account"
          ("id", "account_id", "provider_id", "user_id",
           "password", "created_at", "updated_at")
        SELECT ${accountId}::uuid, "id"::text, 'credential', "id",
               ${passwordHash}, now(), now()
        FROM created_user
        RETURNING "user_id"
      )
      SELECT created_user."id", created_user."email"
      FROM created_user
      JOIN created_account ON created_account."user_id" = created_user."id"
    `);

    const createdUser = result.rows[0];
    if (!createdUser) return invalidInvitation;

    // Et manuelt delt link beviser ikke ejerskab af postkassen.
    // email_verified forbliver false. Login opretter sessionen separat.
    return {
      success: true,
      userId: createdUser.id,
      email: createdUser.email,
    };
  } catch (error) {
    if (isEmailConflict(error)) {
      return {
        success: false,
        code: "EMAIL_IN_USE",
        message: "Der findes allerede en bruger med denne e-mail. Prøv at logge ind.",
      };
    }
    return {
      success: false,
      code: "UNAVAILABLE",
      message: "Kontoen kunne ikke oprettes lige nu. Prøv igen senere.",
    };
  }
}

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateInvitationResult =
  | { success: true; token: string; email: string; expiresAt: Date }
  | { success: false; message: string };

// Kun kaldt fra den beskyttede invitationsside (requireAdmin). Linket vises
// kun i selve svaret; kun hashet gemmes i databasen.
export async function createInvitation(emailInput: unknown): Promise<CreateInvitationResult> {
  if (typeof emailInput !== "string") {
    return { success: false, message: "Udfyld en gyldig e-mailadresse." };
  }
  const email = emailInput.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Udfyld en gyldig e-mailadresse." };
  }
  try {
    const [existingUser] = await db.select({ id: user.id }).from(user)
      .where(eq(user.email, email)).limit(1);
    if (existingUser) {
      return { success: false, message: "Der findes allerede en bruger med denne e-mail." };
    }
    const [activeInvitation] = await db.select({ id: invitation.id }).from(invitation)
      .where(and(
        eq(invitation.email, email),
        isNull(invitation.usedAt),
        isNull(invitation.revokedAt),
        gt(invitation.expiresAt, sql`clock_timestamp()`),
      )).limit(1);
    if (activeInvitation) {
      return {
        success: false,
        message: "Der er allerede et aktivt invitationslink til denne e-mail. Tilbagekald det først, hvis du vil sende et nyt.",
      };
    }
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
    await db.insert(invitation).values({ email, tokenHash, expiresAt });
    return { success: true, token, email, expiresAt };
  } catch {
    return { success: false, message: "Invitationen kunne ikke oprettes lige nu. Prøv igen senere." };
  }
}

export type InvitationStatus = "waiting" | "used" | "revoked" | "expired";

export type InvitationListItem = {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  status: InvitationStatus;
};

export async function listInvitations(): Promise<InvitationListItem[]> {
  const rows = await db.select({
    id: invitation.id,
    email: invitation.email,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    usedAt: invitation.usedAt,
    revokedAt: invitation.revokedAt,
  }).from(invitation).orderBy(desc(invitation.createdAt));
  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    status: row.usedAt ? "used" : row.revokedAt ? "revoked" :
      row.expiresAt.getTime() <= now ? "expired" : "waiting",
  }));
}

// Tilbagekalder kun et ubrugt, endnu ikke tilbagekaldt link. Idempotent:
// kaldes det igen på et allerede tilbagekaldt link, sker der ingenting.
export async function revokeInvitation(idInput: unknown): Promise<{ success: boolean; message?: string }> {
  if (typeof idInput !== "string" || !/^[0-9a-f-]{36}$/i.test(idInput)) {
    return { success: false, message: "Ugyldigt invitations-id." };
  }
  try {
    const result = await db.update(invitation)
      .set({ revokedAt: sql`clock_timestamp()` })
      .where(and(
        eq(invitation.id, idInput),
        isNull(invitation.usedAt),
        isNull(invitation.revokedAt),
      ))
      .returning({ id: invitation.id });
    if (!result.length) {
      return { success: false, message: "Invitationen er allerede brugt, tilbagekaldt eller findes ikke." };
    }
    return { success: true };
  } catch {
    return { success: false, message: "Invitationen kunne ikke tilbagekaldes lige nu. Prøv igen senere." };
  }
}
