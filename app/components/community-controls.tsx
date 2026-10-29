"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, HandFist } from "@phosphor-icons/react";
import { reactAction, shareWorkoutAction, withdrawPostAction } from "@/app/community/actions";
import type { CommunitySummary } from "@/lib/community-summary";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";
import { HEALTH_NOTICE } from "@/lib/health-notice";

export function WithdrawPost({ postId }: { postId: string }) {
  const [, action, pending] = useActionState(withdrawPostAction, {});
  return <form action={action}>
    <input type="hidden" name="postId" value={postId} />
    <button disabled={pending} className="min-h-11 text-sm text-zinc-500 hover:text-red-600 disabled:opacity-50">{pending ? "Trækker tilbage…" : "Træk deling tilbage"}</button>
  </form>;
}

export function CommunityReaction({ postId, count, reacted }: { postId: string; count: number; reacted: boolean }) {
  const [, action, pending] = useActionState(reactAction, {});
  return <form action={action}>
    <input type="hidden" name="postId" value={postId} />
    <input type="hidden" name="active" value={String(!reacted)} />
    <button aria-pressed={reacted} aria-busy={pending} disabled={pending}
      aria-label={`Stærkt! ${count} reaktioner`}
      className={`group inline-flex min-h-11 items-center gap-2.5 rounded-full border py-2 pl-3 pr-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none enabled:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-60 ${reacted ? "border-indigo-600 bg-indigo-600 text-white shadow-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-500" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900"}`}>
      <HandFist size={22} weight={reacted ? "fill" : "duotone"} aria-hidden="true" className="-rotate-12 transition-transform group-hover:rotate-0 motion-reduce:transition-none" />
      <span>Stærkt!</span>
      {reacted && <Check size={14} weight="bold" aria-hidden="true" />}
      <span aria-hidden="true" className={`ml-1 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs tabular-nums ${reacted ? "bg-white/20 text-white" : "bg-white text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"}`}>{count}</span>
    </button>
  </form>;
}

export function ShareWorkout({ workoutId, name, summary, shared }: {
  workoutId: string; name: string; summary: CommunitySummary | null;
  shared: { id: string; summary: CommunitySummary; caption: string } | null;
}) {
  const [state, action, pending] = useActionState(shareWorkoutAction, {});
  const [caption, setCaption] = useState("");
  if (!summary && !shared) return null;
  return <section className="zet-panel space-y-4" aria-label="Del træning">
    <h2 className="zet-sectionTitle">{shared ? "Delt med fællesskabet" : "Del med fællesskabet"}</h2>
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{shared
      ? "Dette er den delte opsummering. Senere rettelser i træningen ændrer ikke opslaget. Træk delingen tilbage og del igen for at opdatere det."
      : "Din træning er privat. Hvis du deler, kan alle med en ZET-konto se dit navn, øvelser, sæt, kg, gentagelser og cardio samt opsummeringen nedenfor. Dine noter deles aldrig."}</p>
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-2">
      <p className="font-semibold">{name}</p>
      {shared?.caption && <p className="whitespace-pre-wrap break-words text-sm">{shared.caption}</p>}
      <CommunitySummaryCard summary={(shared?.summary ?? summary)!} />
    </div>
    {shared ? <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={`/community/${shared.id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Se opslag og kommentarer →</Link>
      <WithdrawPost postId={shared.id} />
    </div> : <form action={action} className="space-y-3">
      <input type="hidden" name="workoutId" value={workoutId} />
      <input type="hidden" name="preview" value={JSON.stringify(summary)} />
      <label className="block text-sm font-medium">Tekst til din træning (valgfrit)
        <textarea name="caption" maxLength={1000} rows={3} placeholder="Hurtig træning med Erik!" value={caption} onChange={(event) => setCaption(event.target.value)} disabled={pending}
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-transparent p-3 dark:border-zinc-700" />
      </label>
      <p className="text-xs text-zinc-500">Teksten deles med fællesskabet. Dine private træningsnoter deles ikke. {HEALTH_NOTICE}</p>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="min-h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white disabled:opacity-50">{pending ? "Deler…" : "Del med fællesskabet"}</button>
    </form>}
  </section>;
}
