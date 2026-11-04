"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};
const inputClass =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm focus:border-indigo-600";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialState);

  if (state.sent) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <h2 className="text-xl font-semibold">Anmodningen er sendt</h2>
        <p className="mt-2 text-sm leading-6">
          Hvis e-mailen har en ZET-konto, får administratoren besked og sender dig et link, hvor du kan vælge en ny
          adgangskode. Det sker ikke automatisk, så der kan gå lidt tid.
        </p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center font-semibold underline">Tilbage til log ind</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">E-mailadresse</label>
          <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className={inputClass} />
        </div>
        {state.error && (
          <p role="alert" className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm leading-6 text-red-800 dark:text-red-200">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sender…" : "Bed om nyt link"}
        </button>
      </fieldset>
      <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-zinc-600 underline dark:text-zinc-400">Tilbage til log ind</Link>
    </form>
  );
}
