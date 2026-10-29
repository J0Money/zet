"use server";

import { acceptInvitation } from "@/lib/invitations";

export type SignupState = {
  success?: boolean;
  error?: string;
};

export async function registerWithInvitation(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // Tidligere klientstate og formularens eventuelle e-mail er ikke autoritet.
  // Adgangskoden returneres aldrig som del af formularens state.
  const password = formData.get("password");
  if (password !== formData.get("confirmPassword")) {
    return { error: "Adgangskoderne er ikke ens." };
  }

  const result = await acceptInvitation({
    token: formData.get("token"),
    name: formData.get("name"),
    password,
    birthDate: formData.get("birthDate"),
    adultPermissionConfirmed: formData.get("adultPermissionConfirmed"),
  });
  return result.success ? { success: true } : { error: result.message };
}
