"use client";

import { useActionState, useState } from "react";
import type { PasswordResetRequest } from "@/lib/password-reset";
import { createPasswordResetAction, dismissPasswordResetRequestAction, type CreateInvitationState } from "./actions";

const initialState: CreateInvitationState = {};

function RequestRow({ request }: { request: PasswordResetRequest }) {
  const [state, action, pending] = useActionState(createPasswordResetAction, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <li className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{request.name}</p>
        <p className="break-all text-zinc-600 dark:text-zinc-400">{request.email}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Bedt om {new Date(request.requestedAt).toLocaleString("da-DK")}</p>
      </div>
      {state.link ? (
        <div className="space-y-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 px-3 py-3 text-indigo-900 dark:text-indigo-100">
          <p>Send linket manuelt. Det vises kun denne ene gang og gælder i 24 timer.</p>
          <p className="break-all rounded bg-white dark:bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">{state.link}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.link!).then(() => setCopied(true), () => setCopied(false))}
            className="min-h-11 rounded-lg border border-indigo-300 bg-white dark:bg-zinc-900 px-4 py-2 font-medium text-indigo-700 dark:text-indigo-300"
          >
            {copied ? "Kopieret" : "Kopiér link"}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <form action={action} className="flex-1">
            <input type="hidden" name="email" value={request.email} />
            <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {pending ? "Opretter…" : "Opret link"}
            </button>
          </form>
          <form action={dismissPasswordResetRequestAction}>
            <input type="hidden" name="userId" value={request.userId} />
            <button type="submit" className="min-h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">
              Afvis
            </button>
          </form>
        </div>
      )}
      {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
    </li>
  );
}

export function ResetRequestList({ requests }: { requests: PasswordResetRequest[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen åbne anmodninger.</p>;
  }
  return (
    <ul className="space-y-3">
      {requests.map((request) => <RequestRow key={request.userId} request={request} />)}
    </ul>
  );
}
