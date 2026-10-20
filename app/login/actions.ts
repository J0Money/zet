"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { loginWithPassword } from "@/lib/login";

export type LoginState = { error?: string };

export async function login(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const result = await loginWithPassword(
    formData.get("email"), formData.get("password"), new Headers(await headers()),
  );
  if (result.error !== undefined) return { error: result.error };
  const cookieStore = await cookies();
  // Bevar Better Auths signerede cookies og deres sikkerhedsindstillinger.
  for (const [name, attributes] of parseSetCookieHeader(result.response.headers.get("set-cookie")!)) {
    cookieStore.set(name, attributes.value, toCookieOptions(attributes));
  }
  redirect("/dashboard");
}
