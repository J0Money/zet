"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerWithInvitation, type SignupState } from "./actions";

const initialState: SignupState = {};
const inputClass =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-indigo-600";

export function SignupForm({
  token,
  email,
  minPasswordLength,
  maxPasswordLength,
}: {
  token: string;
  email: string;
  minPasswordLength: number;
  maxPasswordLength: number;
}) {
  const [state, formAction, pending] = useActionState(registerWithInvitation, initialState);
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (state.success) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <h2 className="text-xl font-semibold">Din konto er oprettet</h2>
        <p className="mt-2 break-words text-sm leading-6">
          Din e-mail er {email}. Du kan nu logge ind.
        </p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center font-semibold underline">Log ind</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            readOnly
            aria-describedby="email-help"
            className={`${inputClass} bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400`}
          />
          <p id="email-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Invitationen gælder denne e-mailadresse.
          </p>
        </div>
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">Dit navn</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Skriv dit navn"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">Adgangskode</label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={minPasswordLength}
            maxLength={maxPasswordLength}
            aria-describedby="password-help"
            className={inputClass}
          />
          <p id="password-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Brug mindst {minPasswordLength} tegn. Vælg en adgangskode, du ikke bruger andre steder.
          </p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
            Gentag adgangskoden
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={minPasswordLength}
            maxLength={maxPasswordLength}
            className={inputClass}
          />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
            className="size-4 accent-indigo-600"
          />
          Vis adgangskoder
        </label>
        {state.error && (
          <p role="alert" className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm leading-6 text-red-800 dark:text-red-200">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Opretter din konto…" : "Opret bruger"}
        </button>
      </fieldset>
    </form>
  );
}
