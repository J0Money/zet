import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LoginForm } from "./login-form";
import { ClearLocalDrafts } from "./clear-local-drafts";
import { getRandomQuote } from "@/lib/motivation-quotes";

export const metadata: Metadata = {
  title: "Log ind | ZET",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ konto?: string | string[] }> }) {
  await connection();
  const accountDeleted = (await searchParams).konto === "slettet";
  // Et nyt, tilfældigt citat pr. besøg, siden er allerede dynamisk pr.
  // request, så et nyt opslag her koster intet ekstra.
  const quote = getRandomQuote();
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Log ind</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Log ind med din e-mailadresse og adgangskode.</p>
      {accountDeleted && (
        <>
          <ClearLocalDrafts />
          <p role="status" className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Din konto og alle dine data er slettet. Tak for denne gang.
          </p>
        </>
      )}
      <LoginForm />
      <Link href="/forgot-password" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 underline hover:text-indigo-800">
        Glemt adgangskode?
      </Link>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Har du ikke en konto? Åbn dit personlige invitationslink for at oprette en.</p>
      <p className="mt-10 text-center text-sm italic leading-6 text-zinc-400">&quot;{quote}&quot;</p>
    </div>
  );
}
