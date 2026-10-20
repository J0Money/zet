import "server-only";
import { auth } from "@/lib/auth";

export async function loginWithPassword(
  email: unknown,
  password: unknown,
  requestHeaders: Headers,
): Promise<{ error: string; response?: never } | { response: Response; error?: never }> {
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || email.length > 254 || !password || password.length > 128) {
    return { error: "Udfyld en gyldig e-mailadresse og adgangskode." };
  }
  try {
    const headers = new Headers({ "content-type": "application/json" });
    for (const name of ["origin", "cookie", "user-agent", "x-forwarded-for"]) {
      const value = requestHeaders.get(name);
      if (value) headers.set(name, value);
    }
    // Hele request-forløbet sikrer, at Better Auths logintæller også bruges her.
    const response = await auth.handler(new Request(
      new URL("/api/auth/sign-in/email", process.env.BETTER_AUTH_URL),
      {
        method: "POST",
        headers,
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      },
    ));
    if (response.status === 429) {
      return { error: "For mange loginforsøg. Vent et minut, og prøv igen." };
    }
    if (!response.ok) {
      return { error: response.status >= 500
        ? "Login virker ikke lige nu. Prøv igen om lidt."
        : "E-mailadressen eller adgangskoden er forkert." };
    }
    if (!response.headers.has("set-cookie")) {
      return { error: "Login kunne ikke fuldføres. Prøv igen om lidt." };
    }
    return { response };
  } catch {
    return { error: "Login virker ikke lige nu. Prøv igen om lidt." };
  }
}
