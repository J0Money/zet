"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { loadDraft, saveDraft, type DraftClearReason } from "@/lib/log-draft";

type DraftOptions = {
  // Siger, om en kladde har udfyldte felter. Uden den giver en ryddet kladde ingen besked.
  hasContent?: (value: unknown) => boolean;
  // Følg ændringer fra andre faner. Slås fra for ting, der ikke skal spejles, fx valgt fane.
  sync?: boolean;
};

// Adgang til localStorage kan selv kaste en fejl, når browseren blokerer lagring.
function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

// Bruges først efter browserens hydrering i LogFormTabs. Formularen monteres
// med brugerens id som key, så en kladde aldrig flyttes mellem brugere.
// initial er en funktion, så hver ny kladde får sit eget engangs-id.
// revise (valgfri, skal være stabil) kan justere hver ændring, fx give et nyt
// engangs-id, når indholdet ændres. clearDraft går uden om den.
// Kladden følger også andre faner via storage-hændelsen. Hændelsen kommer kun i
// de andre faner, og en kladde fra en anden fane skrives aldrig tilbage, så to
// faner kan ikke ende i en løkke.
export function useLocalDraft<T>(
  key: string,
  initial: () => T,
  parse: (value: unknown) => T | null,
  revise?: (previous: T, next: T) => T,
  options?: DraftOptions,
) {
  const hasContent = options?.hasContent;
  const sync = options?.sync ?? true;
  // Læsningen rører ikke ved lageret, så React må køre den flere gange.
  const [restored] = useState(() => {
    const storage = browserStorage();
    const loaded = storage ? loadDraft(storage, key, parse, hasContent) : null;
    const read = loaded?.result;
    if (read?.kind === "draft" && loaded?.raw) {
      // En ældre kladde, der lige har fået et engangs-id, skal gemmes igen med
      // id'et, ellers får den et nyt id ved hver genindlæsning.
      return {
        draft: read.value, saved: JSON.stringify((JSON.parse(loaded.raw) as { value: unknown }).value),
        notice: null as DraftClearReason | null, cleanup: false, readFailed: false,
      };
    }
    const fresh = initial();
    const cleared = read?.kind === "cleared" ? read : null;
    return {
      draft: fresh, saved: JSON.stringify(fresh),
      // Kun en kladde med indhold giver besked, ikke en tom.
      notice: cleared?.hadContent ? cleared.reason : null,
      cleanup: cleared !== null, readFailed: loaded === null || loaded.failed,
    };
  });
  const [draft, setRawDraft] = useState(restored.draft);
  const [notice, setNotice] = useState(restored.notice);
  const [writeFailed, setWriteFailed] = useState(false);
  const lastStored = useRef(restored.saved);
  const setDraft = useCallback<Dispatch<SetStateAction<T>>>((action) => setRawDraft((current) => {
    const next = typeof action === "function" ? (action as (previous: T) => T)(current) : action;
    return revise ? revise(current, next) : next;
  }), [revise]);

  // Udløbne eller ugyldige kladder fjernes, så de ikke bliver liggende og
  // giver samme besked igen. Kladder fra før udløbstiden (v1) har intet
  // tidsstempel og ryddes væk.
  const mustRemove = restored.cleanup;
  useEffect(() => {
    const storage = browserStorage();
    if (!storage) return;
    try {
      if (mustRemove) storage.removeItem(key);
      storage.removeItem(key.replace(":v2:", ":v1:"));
    } catch { /* Browseren kan have blokeret lokal lagring. */ }
  }, [key, mustRemove]);

  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastStored.current) return;
    const storage = browserStorage();
    // Indtastning og gemning på serveren skal stadig virke, hvis lageret svigter.
    const saved = storage !== null && saveDraft(storage, key, draft);
    if (saved) lastStored.current = serialized;
    setWriteFailed(!saved);
  }, [draft, key]);

  // Ændrer en anden fane kladden (eller rydder den efter et gem eller logout),
  // følger denne fane med. lastStored sættes først, så effekten ovenfor ikke
  // skriver den modtagne kladde tilbage.
  useEffect(() => {
    if (!sync) return;
    function onStorage(event: StorageEvent) {
      const storage = browserStorage();
      if (!storage || event.storageArea !== storage) return;
      // key er null, når hele lageret ryddes.
      if (event.key !== null && event.key !== key) return;
      const { result, failed } = loadDraft(storage, key, parse);
      if (failed) return;
      if (result.kind === "draft") {
        const serialized = JSON.stringify(result.value);
        if (serialized === lastStored.current) return;
        lastStored.current = serialized;
        setRawDraft(result.value);
      } else if (result.kind === "none") {
        // Kladden er væk: en anden fane har rydet den. Start forfra med et nyt engangs-id.
        const fresh = initial();
        lastStored.current = JSON.stringify(fresh);
        setRawDraft(fresh);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, initial, parse, sync]);

  const clearDraft = useCallback((next: T) => {
    // Bevar øvelsesvalget på skærmen, men gem ikke de afsluttede indtastninger igen.
    // Den tomme kladde med nyt engangs-id gemmes, så andre faner får samme id og
    // ikke kan gemme de afsluttede sæt en gang til.
    lastStored.current = JSON.stringify(next);
    setRawDraft(next);
    const storage = browserStorage();
    const saved = storage !== null && saveDraft(storage, key, next);
    if (!saved) {
      // Så de afsluttede sæt ikke bliver liggende i lageret.
      try { storage?.removeItem(key); } catch { /* Lokal lagring er valgfri. */ }
    }
    setWriteFailed(!saved);
  }, [key]);
  const dismissNotice = useCallback(() => setNotice(null), []);
  return { draft, setDraft, clearDraft, notice, dismissNotice, storageFailed: restored.readFailed || writeFailed };
}

export function draftField<T, K extends keyof T>(setDraft: Dispatch<SetStateAction<T>>, key: K) {
  return (value: SetStateAction<T[K]>) => setDraft((current) => ({
    ...current,
    [key]: typeof value === "function"
      ? (value as (previous: T[K]) => T[K])(current[key]) : value,
  }));
}
