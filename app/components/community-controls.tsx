"use client";

import Link from "next/link";
import { useActionState } from "react";
import { reactAction, shareWorkoutAction, withdrawPostAction } from "@/app/community/actions";
import type { CommunitySummary } from "@/lib/community-summary";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";

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
    <button aria-pressed={reacted} disabled={pending}
      className={`min-h-11 rounded-xl border px-4 text-sm font-medium disabled:opacity-50 ${reacted ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700"}`}>
      Stærkt! · {count}
    </button>
  </form>;
}

export function ShareWorkout({ workoutId, name, summary, shared }: {
  workoutId: string; name: string; summary: CommunitySummary | null;
  shared: { id: string; summary: CommunitySummary } | null;
}) {
  const [state, action, pending] = useActionState(shareWorkoutAction, {});
  if (!summary && !shared) return null;
  return <section className="zet-panel space-y-4" aria-label="Del træning">
    <h2 className="zet-sectionTitle">{shared ? "Delt med fællesskabet" : "Del med fællesskabet"}</h2>
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{shared
      ? "Dette er den delte opsummering. Senere rettelser i træningen ændrer ikke opslaget. Træk delingen tilbage og del igen for at opdatere det."
      : "Din træning er privat. Hvis du deler, kan alle med en ZET-konto se dit navn og opsummeringen nedenfor. Dine noter deles aldrig."}</p>
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-2">
      <p className="font-semibold">{name}</p>
      <CommunitySummaryCard summary={(shared?.summary ?? summary)!} />
    </div>
    {shared ? <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/community" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Se Community →</Link>
      <WithdrawPost postId={shared.id} />
    </div> : <form action={action} className="space-y-3">
      <input type="hidden" name="workoutId" value={workoutId} />
      <input type="hidden" name="preview" value={JSON.stringify(summary)} />
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="min-h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white disabled:opacity-50">{pending ? "Deler…" : "Del med fællesskabet"}</button>
    </form>}
  </section>;
}
