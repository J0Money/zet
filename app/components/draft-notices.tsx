import { DRAFT_NOTICE_TEXT, DRAFT_STORAGE_FAILED_TEXT, type DraftClearReason } from "@/lib/log-draft";

const noteClass = "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300";

// Rolige beskeder om den lokale kladde: at en gammel kladde blev ryddet (kan lukkes),
// og at browseren ikke kan gemme kladden (vises, så længe det er sandt).
export function DraftNotices({ notice, onDismiss, storageFailed }: {
  notice: DraftClearReason | null;
  onDismiss: () => void;
  storageFailed: boolean;
}) {
  return (
    <div role="status" className="flex flex-col gap-2 empty:hidden">
      {notice && (
        <p className={`${noteClass} flex items-center justify-between gap-3`}>
          <span className="py-3">{DRAFT_NOTICE_TEXT[notice]}</span>
          <button type="button" onClick={onDismiss} className="min-h-11 shrink-0 font-semibold text-indigo-600 dark:text-indigo-400">Luk</button>
        </p>
      )}
      {storageFailed && <p className={`${noteClass} py-3`}>{DRAFT_STORAGE_FAILED_TEXT}</p>}
    </div>
  );
}
