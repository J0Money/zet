"use server";

import { headers } from "next/headers";
import { requestPasswordReset } from "@/lib/password-reset";
import { countRateLimitAttempt } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/request-ip";

export type ForgotPasswordState = { sent?: boolean; error?: string };

// Går uden om Better Auths handler, så dennes rate limiter (kun sat op for
// login) ikke dækker denne formular. Egen grænse pr. IP, samme vindue som
// kontosletningsforsøg.
const FORGOT_PASSWORD_LIMIT = 5;
const FORGOT_PASSWORD_WINDOW_MS = 10 * 60 * 1000;

export async function forgotPassword(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const ip = clientIpFrom(new Headers(await headers()));
  const attempts = await countRateLimitAttempt(`forgot-password:${ip}`, FORGOT_PASSWORD_WINDOW_MS);
  if (attempts > FORGOT_PASSWORD_LIMIT) {
    return { error: "For mange anmodninger. Vent 10 minutter, og prøv igen." };
  }
  try {
    await requestPasswordReset(formData.get("email"));
  } catch {
    return { error: "Anmodningen kunne ikke sendes lige nu. Prøv igen om lidt." };
  }
  // Samme svar, uanset om e-mailen findes, så siden ikke afslører, hvem der har en konto.
  return { sent: true };
}
