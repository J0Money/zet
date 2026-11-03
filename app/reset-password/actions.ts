"use server";

import { resetPasswordWithToken } from "@/lib/password-reset";

export type ResetPasswordState = {
  success?: boolean;
  error?: string;
};

export async function resetPassword(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  // Adgangskoden returneres aldrig som del af formularens state.
  const password = formData.get("password");
  if (password !== formData.get("confirmPassword")) {
    return { error: "Adgangskoderne er ikke ens." };
  }
  const result = await resetPasswordWithToken(formData.get("token"), password);
  return result.success ? { success: true } : { error: result.message };
}
