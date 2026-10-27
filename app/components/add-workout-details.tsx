"use client";

import { useActionState, useState } from "react";
import { addDetailsAction, previewDetailsAction } from "@/app/community/actions";
import type { CommunitySummary } from "@/lib/community-summary";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";

export function AddWorkoutDetails({ postId, summary }: { postId: string; summary: CommunitySummary }) {
  const [preview, setPreview] = useState<CommunitySummary["exercises"]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [state, action, pending] = useActionState(addDetailsAction, {});
  async function loadPreview() {
    setLoading(true); setError("");
    try {
      const details = await previewDetailsAction(postId);
      if (details) setPreview(details);
      else setError("Detaljerne er ikke tilgængelige. Genindlæs siden.");
    } catch { setError("Kunne ikke hente detaljerne. Prøv igen."); }
    finally { setLoading(false); }
  }
  if (summary.exercises) return null;
  return <div className="space-y-3">
    {!preview ? <button type="button" onClick={loadPreview} disabled={loading} className="min-h-11 text-sm font-medium text-indigo-600 dark:text-indigo-400">{loading ? "Henter…" : "Tilføj træningsdetaljer"}</button>
      : <div className="space-y-3 rounded-xl border border-indigo-200 p-3 dark:border-indigo-800">
        <p className="text-sm">Gennemgå din træning nedenfor. Øvelser, sæt, kg, gentagelser samt cardio deles med fællesskabet. Private noter deles ikke. Kommentarer og reaktioner bliver bevaret.</p>
        <p className="text-xs text-zinc-500">Detaljerne hentes fra træningen, som den ser ud nu. Den oprindelige opsummering bevares.</p>
        <CommunitySummaryCard summary={{ ...summary, exercises: preview }} />
        <form action={action} className="flex flex-wrap gap-3">
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="preview" value={JSON.stringify(preview)} />
          <button disabled={pending} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Tilføjer…" : "Del disse detaljer"}</button>
          <button type="button" disabled={pending} onClick={() => setPreview(undefined)} className="min-h-11 px-3 text-sm">Annuller</button>
        </form>
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error} <button type="button" onClick={loadPreview} disabled={loading} className="min-h-11 underline">Hent igen</button></p>}
      </div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
