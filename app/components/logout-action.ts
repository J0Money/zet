"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { signOutCurrentUser } from "@/lib/logout";

export async function logout() {
  const response = await signOutCurrentUser(new Headers(await headers()));
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    const cookieStore = await cookies();
    for (const [name, attributes] of parseSetCookieHeader(setCookie)) {
      cookieStore.set(name, attributes.value, toCookieOptions(attributes));
    }
  }
  redirect("/login");
}
