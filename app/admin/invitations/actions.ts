"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createInvitation, revokeInvitation } from "@/lib/invitations";

export type CreateInvitationState = {
  error?: string;
  link?: string;
  email?: string;
  expiresAt?: string;
};

export async function createInvitationAction(
  _previousState: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  await requireAdmin();
  const result = await createInvitation(formData.get("email"));
  if (!result.success) return { error: result.message };
  const link = new URL(`/signup?token=${result.token}`, process.env.BETTER_AUTH_URL).toString();
  revalidatePath("/admin/invitations");
  return { link, email: result.email, expiresAt: result.expiresAt.toISOString() };
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await revokeInvitation(formData.get("id"));
  revalidatePath("/admin/invitations");
}
