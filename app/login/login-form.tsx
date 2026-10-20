"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-indigo-600";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form action={action} aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required maxLength={254}
            value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">Adgangskode</label>
          <input id="password" name="password" type={showPassword ? "text" : "password"}
            autoComplete="current-password" required maxLength={128} className={inputClass} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-600">
          <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="size-4 accent-indigo-600" />
          Vis adgangskode
        </label>
        {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{state.error}</p>}
        <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Logger ind…" : "Log ind"}
        </button>
      </fieldset>
    </form>
  );
}
