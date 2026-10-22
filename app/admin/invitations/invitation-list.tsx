import type { InvitationListItem, InvitationStatus } from "@/lib/invitations";
import { revokeInvitationAction } from "./actions";

const statusLabel: Record<InvitationStatus, string> = {
  waiting: "Venter",
  used: "Brugt",
  revoked: "Tilbagekaldt",
  expired: "Udløbet",
};

const statusClass: Record<InvitationStatus, string> = {
  waiting: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
  used: "bg-emerald-100 text-emerald-800",
  revoked: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300",
  expired: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300",
};

function formatTimestamp(value: Date): string {
  return value.toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" });
}

export function InvitationList({ invitations }: { invitations: InvitationListItem[] }) {
  if (invitations.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen invitationer oprettet endnu.</p>;
  }
  return (
    <ul className="space-y-3">
      {invitations.map((item) => (
        <li key={item.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{item.email}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Oprettet {formatTimestamp(item.createdAt)} · Udløber {formatTimestamp(item.expiresAt)}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClass[item.status]}`}>
              {statusLabel[item.status]}
            </span>
          </div>
          {item.status === "waiting" && (
            <form action={revokeInvitationAction} className="mt-3">
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="min-h-10 rounded-lg border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950">
                Tilbagekald
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
