import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Glemt adgangskode | ZET",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Glemt adgangskode</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Skriv den e-mail, du logger ind med. Administratoren får besked og sender dig et link til en ny adgangskode.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
