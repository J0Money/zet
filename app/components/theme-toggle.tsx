"use client";

import { useSyncExternalStore } from "react";

const themes = [
  { id: "light", name: "Lyst", description: "Rent og enkelt", colors: ["#f7f7fa", "#ffffff", "#4f46e5"] },
  { id: "dark", name: "Mørkt", description: "Klassisk mørkt", colors: ["#09090b", "#27272a", "#818cf8"] },
  { id: "warm", name: "Warm Studio", description: "Creme og terracotta", colors: ["#f4efe6", "#fffaf3", "#ae431f"] },
  { id: "electric", name: "Electric", description: "Midnatsblå og lavendel", colors: ["#101329", "#1a2040", "#b6a0ff"] },
  { id: "blush", name: "Blush", description: "Lyserød og hindbær", colors: ["#fff0f5", "#fffafd", "#ad3167"] },
];
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function snapshot() { return document.documentElement.dataset.theme ?? "light"; }

export function ThemeToggle() {
  const selected = useSyncExternalStore(subscribe, snapshot, () => "");
  function choose(id: string) {
    const root = document.documentElement;
    root.setAttribute("data-theme", id);
    root.classList.toggle("dark", id === "dark" || id === "electric");
    try { localStorage.setItem("zet-theme", id); } catch { /* Valget virker stadig under besøget. */ }
  }
  return <div className="zet-panel">
    <div className="zet-theme-options" role="group" aria-label="Vælg tema">
      {themes.map((theme) => <button key={theme.id} type="button" aria-pressed={selected === theme.id} onClick={() => choose(theme.id)} className="zet-theme-option">
        <span className="zet-theme-swatches" aria-hidden="true">{theme.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</span>
        <span><strong>{theme.name}</strong><small>{theme.description}</small></span>
        <span className="zet-theme-check" aria-hidden="true">{selected === theme.id ? "✓" : ""}</span>
      </button>)}
    </div>
    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Dit tema huskes i denne browser.</p>
  </div>;
}
