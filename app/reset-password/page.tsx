import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { isPasswordResetTokenValid } from "@/lib/password-reset";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Ny adgangskode | ZET",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Linkets gyldighed skal kontrolleres ved hvert besøg.
export const instant = false;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  await connection();
  const { token } = await searchParams;
  const valid = await isPasswordResetTokenValid(token).catch(() => false);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Ny adgangskode</h1>
      {valid && typeof token === "string" ? (
        <>
          <p className="mb-8 mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Vælg en ny adgangskode til din ZET-konto.
          </p>
          <ResetPasswordForm
            token={token}
            minPasswordLength={auth.options.emailAndPassword.minPasswordLength}
            maxPasswordLength={auth.options.emailAndPassword.maxPasswordLength}
          />
        </>
      ) : (
        <div role="status" className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Linket kan ikke bruges</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Linket er ugyldigt, udløbet eller allerede brugt. Bed om et nyt.
          </p>
        </div>
      )}
    </div>
  );
}
