"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { deleteAccount } from "@/lib/account-deletion";
import { signOutCurrentUser } from "@/lib/logout";
import { requireUser } from "@/lib/session";

export type DeleteAccountState = { error?: string };

export async function deleteAccountAction(_previous: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  // Brugeren kommer altid fra sessionen, aldrig fra formularen.
  const currentUser = await requireUser();
  const result = await deleteAccount(currentUser.id, formData.get("password"));
  if (!result.success) return { error: result.message };

  // Sessionen er slettet sammen med kontoen. Udløbet cookie sendes med Better Auths
  // egne indstillinger, ligesom ved logout.
  const response = await signOutCurrentUser(new Headers(await headers()));
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    const cookieStore = await cookies();
    for (const [name, attributes] of parseSetCookieHeader(setCookie)) {
      cookieStore.set(name, attributes.value, toCookieOptions(attributes));
    }
  }
  redirect("/login?konto=slettet");
}
