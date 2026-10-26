"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseDraft } from "@/lib/log-draft";

// Bruges først efter browserens hydrering i LogFormTabs. Formularen monteres
// med brugerens id som key, så en kladde aldrig flyttes mellem brugere.
export function useLocalDraft<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  const [draft, setDraft] = useState(() => {
    try {
      return parseDraft(localStorage.getItem(key), validate) ?? initial;
    } catch { /* Browseren kan have blokeret lokal lagring. */ }
    return initial;
  });
  const lastStored = useRef(JSON.stringify(draft));

  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastStored.current) return;
    try {
      localStorage.setItem(key, serialized);
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
