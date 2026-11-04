"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Trophy } from "@phosphor-icons/react";
import { bigFiveLeaderboards, resolveRankedPin, type LeaderboardResult, type LeaderboardExercise } from "@/lib/community-leaderboard";
import { equipmentLabel } from "@/lib/equipment";
import {
  MAX_RANKED_PINS,
  parseRankedPins,
  rankedPinId,
  rankedPinsKey,
  serializeRankedPins,
  type RankedPin,
} from "@/lib/community-ranked-pins";
import { ProfileAvatar } from "./profile-avatar";
import { formatDateDanish } from "@/lib/dates";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function equipmentBadgeLabel(equipment: RankedPin["equipment"]) {
  return equipment === "unspecified" ? "Ikke angivet" : equipmentLabel[equipment];
}

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

function emptyPinMessage(name: string, equipment: RankedPin["equipment"]) {
  const label = equipmentBadgeLabel(equipment);
  return `Ingen resultater endnu. Del en træning med ${name} og ${label.toLowerCase()} for at tage den første plads.`;
}

export function CommunityLeaderboard({ exercises, currentUserId }: { exercises: LeaderboardExercise[]; currentUserId: string }) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (!ready) {
    return <CommunityLeaderboardBody exercises={exercises} currentUserId={currentUserId} pins={[]} setPins={null} />;
  }
  return <CommunityLeaderboardHydrated exercises={exercises} currentUserId={currentUserId} />;
}

function CommunityLeaderboardHydrated({ exercises, currentUserId }: { exercises: LeaderboardExercise[]; currentUserId: string }) {
  const storageKey = rankedPinsKey(currentUserId);
  const [pins, setPinsState] = useState<RankedPin[]>(() => {
    try {
      return parseRankedPins(localStorage.getItem(storageKey));
    } catch {
      return [];
    }
  });
  const setPins = useCallback((next: RankedPin[] | ((previous: RankedPin[]) => RankedPin[])) => {
    setPinsState((previous) => {
      const resolved = typeof next === "function" ? next(previous) : next;
      try {
        localStorage.setItem(storageKey, serializeRankedPins(resolved));
      } catch { /* Lokal lagring er valgfri. */ }
      return resolved;
    });
  }, [storageKey]);
  return <CommunityLeaderboardBody exercises={exercises} currentUserId={currentUserId} pins={pins} setPins={setPins} />;
}

function CommunityLeaderboardBody({
  exercises,
  currentUserId,
  pins,
  setPins,
}: {
  exercises: LeaderboardExercise[];
  currentUserId: string;
  pins: RankedPin[];
  setPins: ((next: RankedPin[] | ((previous: RankedPin[]) => RankedPin[])) => void) | null;
}) {
  const [exerciseKey, setExerciseKey] = useState(exercises[0]?.key ?? "");
  const selected = exercises.find((exercise) => exercise.key === exerciseKey) ?? exercises[0];
  const [equipment, setEquipment] = useState<string>(selected?.variants[0]?.equipment ?? "");
  const variant = selected?.variants.find((item) => item.equipment === equipment) ?? selected?.variants[0];
  const activePinId = selected && variant ? rankedPinId({ exerciseKey: selected.key, name: selected.name, equipment: variant.equipment }) : null;
  const isPinned = activePinId !== null && pins.some((pin) => rankedPinId(pin) === activePinId);
  const pinLimitReached = pins.length >= MAX_RANKED_PINS;

  const togglePin = () => {
    if (!setPins || !selected || !variant) return;
    const id = rankedPinId({ exerciseKey: selected.key, name: selected.name, equipment: variant.equipment });
    if (pins.some((pin) => rankedPinId(pin) === id)) {
      setPins(pins.filter((pin) => rankedPinId(pin) !== id));
      return;
    }
    if (pins.length >= MAX_RANKED_PINS) return;
    setPins([...pins, { exerciseKey: selected.key, name: selected.name, equipment: variant.equipment }]);
  };

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
    {pins.length > 0 && <div className="space-y-4" aria-label="Dine fremhævede øvelser">
      {pins.map((pin) => {
        const resolved = resolveRankedPin(exercises, pin);
        const badge = equipmentBadgeLabel(resolved.equipment);
        return <section key={rankedPinId(pin)} className="zet-panel space-y-4" aria-labelledby={`pinned-${rankedPinId(pin)}`}>
          <header className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-medium text-zinc-500">DIN FREMHÆVNING</p><h3 id={`pinned-${rankedPinId(pin)}`} className="mt-1 break-words text-lg font-semibold">{resolved.name}</h3></div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{badge}</span>
              {setPins && <button type="button" className="min-h-11 rounded-lg px-2 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300" onClick={() => setPins(pins.filter((item) => rankedPinId(item) !== rankedPinId(pin)))}>Fjern kort</button>}
            </div>
          </header>
          {resolved.results.length ? <RankingRows name={resolved.name} results={resolved.results} currentUserId={currentUserId} />
            : <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyPinMessage(resolved.name, resolved.equipment)}</p>}
          {resolved.equipment === "unspecified" && <p className="text-xs text-zinc-500">Udstyr var ikke angivet i disse opslag. De sammenlignes separat.</p>}
        </section>;
      })}
    </div>}
    <section className="zet-panel" aria-labelledby="other-ranked-heading">
      <h3 id="other-ranked-heading" className="text-lg font-semibold">Andre øvelser og udstyr</h3>
    {!selected ? <p className="mt-5 text-sm text-zinc-500">Del en styrketræning med træningsdetaljer for at starte ranglisten.</p> : <>
      <div className="my-5 grid grid-cols-2 gap-3">
        <label className="min-w-0 text-xs font-medium">Øvelse<select className={selectClass} value={selected.key} onChange={(event) => setExerciseKey(event.target.value)}>{exercises.map((exercise) => <option className={optionClass} key={exercise.key} value={exercise.key}>{exercise.name}</option>)}</select></label>
        <label className="min-w-0 text-xs font-medium">Udstyr<select className={selectClass} value={variant?.equipment} onChange={(event) => setEquipment(event.target.value)}>{selected.variants.map((item) => <option className={optionClass} key={item.equipment} value={item.equipment}>{item.equipment === "unspecified" ? "Ikke angivet" : equipmentLabel[item.equipment]}</option>)}</select></label>
      </div>
      <RankingRows name={selected.name} results={variant?.results ?? []} currentUserId={currentUserId} />
      {setPins && variant && <div className="mt-4 space-y-2">
        <button type="button" className="min-h-11 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200" onClick={togglePin} disabled={!isPinned && pinLimitReached}>
          {isPinned ? "Fjern fremhævning" : "Fremhæv som kort"}
        </button>
        {!isPinned && pinLimitReached && <p className="text-xs text-zinc-500">Du kan fremhæve højst {MAX_RANKED_PINS} øvelser. Fjern et kort ovenfor for at tilføje en ny.</p>}
        {!isPinned && !pinLimitReached && <p className="text-xs text-zinc-500">Kortet vises under Big 5 på denne enhed.</p>}
      </div>}
      {variant?.equipment === "unspecified" && <p className="mt-4 text-xs text-zinc-500">Udstyr var ikke angivet i disse opslag. De sammenlignes separat.</p>}
      {variant && variant.results.length < 3 && <p className="mt-4 text-xs text-zinc-500">Plads til flere! Del en træning med denne øvelse og samme udstyr.</p>}
    </>}
    </section>
    <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Én plads pr. person. Samme kg og gentagelser giver delt placering. Ældre opslag uden træningsdetaljer tæller ikke.</p>
  </section>;
}
