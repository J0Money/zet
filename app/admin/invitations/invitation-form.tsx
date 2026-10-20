"use client";

import { useActionState, useRef, useState } from "react";
import { createInvitationAction, type CreateInvitationState } from "./actions";

const initialState: CreateInvitationState = {};
const inputClass = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-indigo-600";

export function InvitationForm() {
  const [state, action, pending] = useActionState(createInvitationAction, initialState);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={(formData) => {
          setCopied(false);
          action(formData);
          formRef.current?.reset();
        }}
        aria-busy={pending}
      >
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">E-mailadresse</label>
            <input id="email" name="email" type="email" required maxLength={254} className={inputClass} />
          </div>
          {state.error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Opretter…" : "Opret invitationslink"}
          </button>
        </fieldset>
      </form>
      {state.link && (
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-sm leading-6 text-indigo-900">
          <p>
            Link til <strong>{state.email}</strong>. Gyldigt til{" "}
            {state.expiresAt && new Date(state.expiresAt).toLocaleString("da-DK")}. Kopier og send det manuelt,
            det vises kun denne ene gang.
          </p>
          <p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-zinc-700">{state.link}</p>
          <button
            type="button"
            onClick={() => copyLink(state.link!)}
            className="min-h-11 rounded-lg border border-indigo-300 bg-white px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-100"
          >
            {copied ? "Kopieret" : "Kopiér link"}
          </button>
        </div>
      )}
    </div>
  );
}
