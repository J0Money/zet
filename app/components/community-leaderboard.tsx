"use client";
import { useState } from "react";
import Link from "next/link";
import { Trophy } from "@phosphor-icons/react";
import { bigFiveLeaderboards, type LeaderboardResult, type LeaderboardExercise } from "@/lib/community-leaderboard";
import { equipmentLabel } from "@/lib/equipment";
import { ProfileAvatar } from "./profile-avatar";
import { formatDateDanish } from "@/lib/dates";

const selectClass = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const optionClass = "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50";
function RankingRows({ name, results, currentUserId }: { name: string; results: LeaderboardResult[]; currentUserId: string }) {
  return (<ol className="divide-y divide-zinc-100 dark:divide-zinc-800" aria-label={`Top 3 i ${name}`}>
        {results.map((result) => <li key={result.userId} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className={`w-5 shrink-0 text-center text-sm font-bold tabular-nums ${result.rank === 1 ? "text-amber-600 dark:text-amber-300" : "text-zinc-500"}`} aria-label={`Plads ${result.rank}`}>{result.rank}</span>
          <span className="shrink-0 overflow-hidden rounded-full bg-indigo-50 font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ProfileAvatar userId={result.userId} image={result.image} name={result.name} size={36} /></span>
          <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{result.name}{result.userId === currentUserId && <span className="ml-1 text-xs font-normal text-zinc-500">(dig)</span>}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateDanish(result.date)}</p></div>
          <Link href={`/community/${result.postId}`} className="shrink-0 rounded-lg py-3 text-right text-sm font-semibold tabular-nums text-indigo-700 hover:underline dark:text-indigo-300" aria-label={`Se ${result.name}s sæt: ${result.weightKg} kg gange ${result.reps}`}>{new Intl.NumberFormat("da-DK").format(result.weightKg)} kg × {result.reps}</Link>
        </li>)}
      </ol>);
}

export function CommunityLeaderboard({ exercises, currentUserId }: { exercises: LeaderboardExercise[]; currentUserId: string }) {
  const [exerciseKey, setExerciseKey] = useState(exercises[0]?.key ?? "");
  const selected = exercises.find((exercise) => exercise.key === exerciseKey) ?? exercises[0];
  const [equipment, setEquipment] = useState<string>(selected?.variants[0]?.equipment ?? "");
  const variant = selected?.variants.find((item) => item.equipment === equipment) ?? selected?.variants[0];
  return <section className="community-leaderboard space-y-5" aria-labelledby="leaderboard-heading">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">FÆLLESSKABETS TOP 3</p><h2 id="leaderboard-heading" className="mt-1 text-xl font-semibold tracking-tight">Ranked</h2></div>
      <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><Trophy size={24} weight="duotone" aria-hidden="true" /></span>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">Alle tider · Kun delte træninger. Højeste kg først, derefter flest gentagelser.</p>
    <div className="space-y-4" aria-label="Big 5">
      {bigFiveLeaderboards(exercises).map((exercise, index) => <section key={exercise.key} className="zet-panel space-y-4" aria-labelledby={`big-five-${exercise.key.replaceAll(" ", "-")}`}>
        <header className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-medium text-zinc-500">BIG 5 · {index + 1}/5</p><h3 id={`big-five-${exercise.key.replaceAll(" ", "-")}`} className="mt-1 text-lg font-semibold">{exercise.name}</h3></div>
          <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Stang</span>
        </header>
        {exercise.results.length ? <RankingRows name={exercise.name} results={exercise.results} currentUserId={currentUserId} />
          : <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingen resultater endnu. Del en træning med {exercise.name} og stang for at tage den første plads.</p>}
      </section>)}
    </div>
    <section className="zet-panel" aria-labelledby="other-ranked-heading">
      <h3 id="other-ranked-heading" className="text-lg font-semibold">Andre øvelser og udstyr</h3>
    {!selected ? <p className="mt-5 text-sm text-zinc-500">Del en styrketræning med træningsdetaljer for at starte ranglisten.</p> : <>
      <div className="my-5 grid grid-cols-2 gap-3">
        <label className="min-w-0 text-xs font-medium">Øvelse<select className={selectClass} value={selected.key} onChange={(event) => setExerciseKey(event.target.value)}>{exercises.map((exercise) => <option className={optionClass} key={exercise.key} value={exercise.key}>{exercise.name}</option>)}</select></label>
        <label className="min-w-0 text-xs font-medium">Udstyr<select className={selectClass} value={variant?.equipment} onChange={(event) => setEquipment(event.target.value)}>{selected.variants.map((item) => <option className={optionClass} key={item.equipment} value={item.equipment}>{item.equipment === "unspecified" ? "Ikke angivet" : equipmentLabel[item.equipment]}</option>)}</select></label>
      </div>
      <RankingRows name={selected.name} results={variant?.results ?? []} currentUserId={currentUserId} />
      {variant?.equipment === "unspecified" && <p className="mt-4 text-xs text-zinc-500">Udstyr var ikke angivet i disse opslag. De sammenlignes separat.</p>}
      {variant && variant.results.length < 3 && <p className="mt-4 text-xs text-zinc-500">Plads til flere! Del en træning med denne øvelse og samme udstyr.</p>}
    </>}
    </section>
    <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Én plads pr. person. Samme kg og gentagelser giver delt placering. Ældre opslag uden træningsdetaljer tæller ikke.</p>
  </section>;
}
