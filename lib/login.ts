import "server-only";
import { createHash } from "node:crypto";
import { auth } from "@/lib/auth";
import { clearRateLimit, countRateLimitAttempt, currentRateLimitCount } from "@/lib/rate-limit";

// Grænse pr. konto ud over Better Auths grænse pr. IP (lib/auth.ts), så gæt
// fra mange IP-adresser på én konto også bremses. Vedtaget af Joachim 23.
// november 2026. Gælder alle e-mails, også ukendte, så beskeden ikke afslører,
// om en konto findes. Kun forkerte forsøg tæller, og et korrekt login nulstiller.
// Nøglen er et hash af e-mailen, så rate_limit ikke indeholder adresser.
export const ACCOUNT_LOGIN_LIMIT = 10;
export const ACCOUNT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const ACCOUNT_LOCKED_MESSAGE = "For mange forkerte forsøg på denne konto. Vent 15 minutter, og prøv igen.";

export function accountLoginKey(normalizedEmail: string): string {
  return `login-account:${createHash("sha256").update(normalizedEmail).digest("hex")}`;
}

export async function loginWithPassword(
  email: unknown,
  password: unknown,
  requestHeaders: Headers,
): Promise<{ error: string; response?: never } | { response: Response; error?: never }> {
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || email.length > 254 || !password || password.length > 128) {
    return { error: "Udfyld en gyldig e-mailadresse og adgangskode." };
  }
  const normalizedEmail = email.trim().toLowerCase();
  const accountKey = accountLoginKey(normalizedEmail);
  try {
    if (await currentRateLimitCount(accountKey, ACCOUNT_LOGIN_WINDOW_MS) >= ACCOUNT_LOGIN_LIMIT) {
      return { error: ACCOUNT_LOCKED_MESSAGE };
    }
    const headers = new Headers({ "content-type": "application/json" });
    for (const name of ["origin", "cookie", "user-agent", "x-real-ip", "x-forwarded-for"]) {
      const value = requestHeaders.get(name);
      if (value) headers.set(name, value);
    }
    // Hele request-forløbet sikrer, at Better Auths logintæller også bruges her.
    const response = await auth.handler(new Request(
      new URL("/api/auth/sign-in/email", process.env.BETTER_AUTH_URL),
      {
        method: "POST",
        headers,
        body: JSON.stringify({ email: normalizedEmail, password }),
      },
    ));
    if (response.status === 429) {
      return { error: "For mange loginforsøg. Vent et minut, og prøv igen." };
    }
    if (!response.ok) {
      if (response.status >= 500) return { error: "Login virker ikke lige nu. Prøv igen om lidt." };
      await countRateLimitAttempt(accountKey, ACCOUNT_LOGIN_WINDOW_MS);
      return { error: "E-mailadressen eller adgangskoden er forkert." };
    }
    if (!response.headers.has("set-cookie")) {
      return { error: "Login kunne ikke fuldføres. Prøv igen om lidt." };
    }
    await clearRateLimit(accountKey);
    return { response };
  } catch {
    return { error: "Login virker ikke lige nu. Prøv igen om lidt." };
  }
}
