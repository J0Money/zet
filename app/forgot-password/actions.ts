"use server";

import { requestPasswordReset } from "@/lib/password-reset";

export type ForgotPasswordState = { sent?: boolean; error?: string };

export async function forgotPassword(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  try {
    await requestPasswordReset(formData.get("email"));
  } catch {
    return { error: "Anmodningen kunne ikke sendes lige nu. Prøv igen om lidt." };
  }
  // Samme svar, uanset om e-mailen findes, så siden ikke afslører, hvem der har en konto.
  return { sent: true };
}
