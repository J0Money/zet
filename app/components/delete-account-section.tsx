"use client";

import { useActionState, useState } from "react";
import { Warning } from "@phosphor-icons/react";
import { deleteAccountAction, type DeleteAccountState } from "@/app/settings/delete-account-action";

const initialState: DeleteAccountState = {};

export function DeleteAccountSection() {
  const [state, action, pending] = useActionState(deleteAccountAction, initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="zet-sectionTitle">Slet konto</h2>
      <div className="zet-panel space-y-4 border-red-200 dark:border-red-900">
        <p className="flex items-start gap-3 text-sm font-medium text-red-700 dark:text-red-300">
          <Warning aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
          Når du sletter din konto, forsvinder alle dine data. Det kan ikke fortrydes.
        </p>
        <div className="space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          <p>Disse ting slettes for altid: dine træningspas med sæt og cardio, dine noter og programmer, dine Community-opslag, kommentarer og reaktioner, dit profilbillede, dine push-beskeder og dit login.</p>
          <p>Egne øvelser, som andre har brugt i deres træning, bliver i appen som fælles øvelser uden ejer, så andres historik ikke går tabt. Dine øvrige egne øvelser slettes.</p>
          <p>Der sendes ingen e-mail. Skriv din adgangskode for at bekræfte.</p>
        </div>
        <form action={action} aria-busy={pending} className="space-y-3">
          <label htmlFor="delete-password" className="block text-sm font-medium">Adgangskode</label>
          <input id="delete-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
            required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="size-4 accent-red-600" />
            Vis adgangskode
          </label>
          {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{state.error}</p>}
          <button type="submit" disabled={pending || !password}
            className="min-h-12 w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Sletter…" : "Slet min konto og alle mine data"}
          </button>
        </form>
      </div>
    </section>
  );
}
