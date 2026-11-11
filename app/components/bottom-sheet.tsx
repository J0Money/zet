"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

// Skuffe, der kommer op nedefra over siden. Lukkes med "Luk", et tryk på det
// mørke felt eller Escape. Siden bagved kan ikke scrolle, mens skuffen er åben.
// Indholdet ligger i samme DOM-træ som kaldet, så en <form> omkring skuffen
// stadig sender felterne indeni.
export function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 dark:border-zinc-700">
          <h3 className="min-w-0 truncate py-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 px-2 text-sm font-medium text-indigo-600 dark:text-indigo-400"
          >
            Luk
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{children}</div>
      </div>
    </>
  );
}
