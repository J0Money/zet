"use client";

import { useEffect } from "react";
import { clearAllDrafts } from "@/lib/log-draft";

// Efter kontosletning ryddes lokale kladder i denne browser, som ved logout.
// Det sker her og ikke før sletningen, så en forkert adgangskode ikke koster kladder.
export function ClearLocalDrafts() {
  useEffect(() => {
    try { clearAllDrafts(localStorage); } catch { /* Lokal lagring kan være blokeret. */ }
  }, []);
  return null;
}
