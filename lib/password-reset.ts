import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, user, verification } from "@/lib/db/schema";

// ZET sender ingen e-mails. Admin laver et engangslink og sender det manuelt,
// ligesom invitationer. Better Auth gemmer koden hashet og bruger den én gang.
const identifierFor = (token: string) => `reset-password:${token}`;
// En anmodning fra "Glemt adgangskode?" på login-siden. Ligger i samme tabel
// og slettes automatisk, når admin laver et link (createPasswordReset).
const REQUEST_IDENTIFIER = "reset-request";
const REQUEST_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

async function findCredentialUserId(emailInput: unknown): Promise<string | null> {
  if (typeof emailInput !== "string") return null;
  const email = emailInput.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  const [found] = await db.select({ id: user.id }).from(user)
    .innerJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential")))
    .where(eq(user.email, email)).limit(1);
  return found?.id ?? null;
}

// Afslører aldrig, om e-mailen findes. Højst én åben anmodning pr. bruger.
export async function requestPasswordReset(emailInput: unknown): Promise<void> {
  const userId = await findCredentialUserId(emailInput);
  if (!userId) return;
  await db.delete(verification).where(and(eq(verification.identifier, REQUEST_IDENTIFIER), eq(verification.value, userId)));
  await db.insert(verification).values({
    identifier: REQUEST_IDENTIFIER, value: userId, expiresAt: new Date(Date.now() + REQUEST_LIFETIME_MS),
  });
}

export type PasswordResetRequest = { userId: string; name: string; email: string; requestedAt: string };

export async function listPasswordResetRequests(): Promise<PasswordResetRequest[]> {
  await db.delete(verification).where(and(eq(verification.identifier, REQUEST_IDENTIFIER), lt(verification.expiresAt, new Date())));
  const rows = await db.select({ userId: user.id, name: user.name, email: user.email, requestedAt: verification.createdAt })
    .from(verification).innerJoin(user, eq(sql`${user.id}::text`, verification.value))
    .where(eq(verification.identifier, REQUEST_IDENTIFIER)).orderBy(desc(verification.createdAt));
  return rows.map((row) => ({ ...row, requestedAt: row.requestedAt.toISOString() }));
}

export async function dismissPasswordResetRequest(userId: unknown): Promise<void> {
  if (typeof userId !== "string") return;
  await db.delete(verification).where(and(eq(verification.identifier, REQUEST_IDENTIFIER), eq(verification.value, userId)));
}

export type CreatePasswordResetResult =
  | { success: true; token: string; email: string; expiresAt: Date }
  | { success: false; message: string };

export async function createPasswordReset(emailInput: unknown): Promise<CreatePasswordResetResult> {
  try {
    const userId = await findCredentialUserId(emailInput);
    if (!userId) return { success: false, message: "Der findes ingen bruger med adgangskode på denne e-mail." };
    const email = (emailInput as string).trim().toLowerCase();
    // Kun det nyeste link virker, og en åben anmodning fra brugeren lukkes.
    // Nulstilling er det eneste, verification bruges til.
    await db.delete(verification).where(eq(verification.value, userId));
    const token = randomBytes(32).toString("hex");
    const context = await auth.$context;
    const expiresAt = new Date(Date.now() + context.options.emailAndPassword!.resetPasswordTokenExpiresIn! * 1000);
    await context.internalAdapter.createVerificationValue({ identifier: identifierFor(token), value: userId, expiresAt });
    return { success: true, token, email, expiresAt };
  } catch {
    return { success: false, message: "Linket kunne ikke oprettes lige nu. Prøv igen senere." };
  }
}

export async function isPasswordResetTokenValid(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  const context = await auth.$context;
  const found = await context.internalAdapter.findVerificationValue(identifierFor(token));
  return Boolean(found && found.expiresAt > new Date());
}

export async function resetPasswordWithToken(token: unknown, password: unknown): Promise<{ success: true } | { success: false; message: string }> {
  const { minPasswordLength, maxPasswordLength } = auth.options.emailAndPassword;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { success: false, message: "Linket er ugyldigt, udløbet eller allerede brugt." };
  }
  if (typeof password !== "string" || password.length < minPasswordLength || password.length > maxPasswordLength) {
    return { success: false, message: `Adgangskoden skal være mellem ${minPasswordLength} og ${maxPasswordLength} tegn.` };
  }
  try {
    await auth.api.resetPassword({ body: { token, newPassword: password } });
    return { success: true };
  } catch {
    return { success: false, message: "Linket er ugyldigt, udløbet eller allerede brugt. Bed om et nyt." };
  }
}
