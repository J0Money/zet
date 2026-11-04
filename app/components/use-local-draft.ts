"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseDraft, serializeDraft } from "@/lib/log-draft";

// Bruges først efter browserens hydrering i LogFormTabs. Formularen monteres
// med brugerens id som key, så en kladde aldrig flyttes mellem brugere.
// initial er en funktion, så hver ny kladde får sit eget engangs-id.
export function useLocalDraft<T>(key: string, initial: () => T, parse: (value: unknown) => T | null) {
  const [restored] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const stored = parseDraft(raw, parse);
      // Udløbne eller ugyldige kladder fjernes, så de ikke bliver liggende.
      if (stored === null) localStorage.removeItem(key);
      // Kladder fra før udløbstiden (v1) har intet tidsstempel og ryddes væk.
      localStorage.removeItem(key.replace(":v2:", ":v1:"));
      // En ældre kladde, der lige har fået et engangs-id, skal gemmes igen med
      // id'et, ellers får den et nyt id ved hver genindlæsning.
      if (stored !== null && raw !== null) {
        return { draft: stored, saved: JSON.stringify((JSON.parse(raw) as { value: unknown }).value) };
      }
    } catch { /* Browseren kan have blokeret lokal lagring. */ }
    const fresh = initial();
    return { draft: fresh, saved: JSON.stringify(fresh) };
  });
  const [draft, setDraft] = useState(restored.draft);
  const lastStored = useRef(restored.saved);

  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastStored.current) return;
    try {
      localStorage.setItem(key, serializeDraft(draft));
      lastStored.current = serialized;
    } catch { /* Indtastning og gemning på serveren skal stadig virke. */ }
  }, [draft, key]);

  const clearDraft = useCallback((next: T) => {
    // Bevar øvelsesvalget på skærmen, men gem ikke de afsluttede indtastninger igen.
    lastStored.current = JSON.stringify(next);
    setDraft(next);
    try { localStorage.removeItem(key); } catch { /* Lokal lagring er valgfri. */ }
  }, [key]);
  return { draft, setDraft, clearDraft };
}

export function draftField<T, K extends keyof T>(setDraft: Dispatch<SetStateAction<T>>, key: K) {
  return (value: SetStateAction<T[K]>) => setDraft((current) => ({
    ...current,
    [key]: typeof value === "function"
      ? (value as (previous: T[K]) => T[K])(current[key]) : value,
  }));
}
