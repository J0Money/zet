import type { Metadata } from "next";
import { connection } from "next/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log ind | ZET",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function LoginPage() {
  await connection();
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Log ind</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-zinc-600">Log ind med din e-mailadresse og adgangskode.</p>
      <LoginForm />
      <p className="mt-6 text-sm leading-6 text-zinc-500">Har du ikke en konto? Åbn dit personlige invitationslink for at oprette en.</p>
    </div>
  );
}
