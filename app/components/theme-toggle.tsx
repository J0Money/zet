"use client";

// Ikonet styres rent af CSS (dark:hidden/dark:block), ikke React-state, så
// der ikke er en kort periode efter indlæsning, hvor det forkerte ikon
// vises, mens komponenten finder ud af det aktuelle tema.
import { Moon, Sun } from "@phosphor-icons/react";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("zet-theme", next ? "dark" : "light");
    } catch {
      // Fx privat browsing uden adgang til localStorage; temaet virker
      // stadig resten af besøget, det huskes bare ikke til næste gang.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Skift mellem lyst og mørkt tema"
      className="flex w-full flex-col items-center gap-1 border-t-2 border-transparent py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-indigo-600"
    >
      <Sun aria-hidden="true" size={22} weight="regular" className="dark:hidden" />
      <Moon aria-hidden="true" size={22} weight="regular" className="hidden dark:block" />
      <span className="dark:hidden">Mørkt</span>
      <span className="hidden dark:inline">Lyst</span>
    </button>
  );
}
