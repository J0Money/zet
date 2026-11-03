import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, user, verification } from "@/lib/db/schema";

// ZET sender ingen e-mails. Admin laver et engangslink og sender det manuelt,
// ligesom invitationer. Better Auth gemmer koden hashet og bruger den én gang.
const identifierFor = (token: string) => `reset-password:${token}`;

export type CreatePasswordResetResult =
  | { success: true; token: string; email: string; expiresAt: Date }
  | { success: false; message: string };

export async function createPasswordReset(emailInput: unknown): Promise<CreatePasswordResetResult> {
  if (typeof emailInput !== "string") return { success: false, message: "Udfyld en gyldig e-mailadresse." };
  const email = emailInput.trim().toLowerCase();
  if (!email || email.length > 254) return { success: false, message: "Udfyld en gyldig e-mailadresse." };
  try {
    const [found] = await db.select({ id: user.id }).from(user)
      .innerJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential")))
      .where(eq(user.email, email)).limit(1);
    if (!found) return { success: false, message: "Der findes ingen bruger med adgangskode på denne e-mail." };
    // Kun det nyeste link virker. Nulstilling er det eneste, verification bruges til.
    await db.delete(verification).where(eq(verification.value, found.id));
    const token = randomBytes(32).toString("hex");
    const context = await auth.$context;
    const expiresAt = new Date(Date.now() + context.options.emailAndPassword!.resetPasswordTokenExpiresIn! * 1000);
    await context.internalAdapter.createVerificationValue({ identifier: identifierFor(token), value: found.id, expiresAt });
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
