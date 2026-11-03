"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};
const inputClass =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-base text-zinc-900 dark:text-zinc-50 shadow-sm focus:border-indigo-600";

export function ResetPasswordForm({
  token,
  minPasswordLength,
  maxPasswordLength,
}: {
  token: string;
  minPasswordLength: number;
  maxPasswordLength: number;
}) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  if (state.success) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <h2 className="text-xl font-semibold">Din adgangskode er skiftet</h2>
        <p className="mt-2 text-sm leading-6">Du er logget ud på dine andre enheder. Log ind med den nye adgangskode.</p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center font-semibold underline">Log ind</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
      <input type="hidden" name="token" value={token} />
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">Ny adgangskode</label>
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
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Gentag adgangskoden</label>
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
          className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Gemmer…" : "Gem ny adgangskode"}
        </button>
      </fieldset>
    </form>
  );
}
