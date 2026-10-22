"use client";

// Både kontakten og dens prik styres af ren CSS (dark:-varianter), ikke
// React-state, så der ikke opstår et kort øjeblik med forkert position,
// efter siden er indlæst, se forklaringen i app/layout.tsx.
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
      className="zet-panel flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Mørkt tema</span>
      <span
        aria-hidden="true"
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-zinc-300 dark:bg-indigo-600 transition-colors"
      >
        <span className="inline-block h-5 w-5 translate-x-0.5 dark:translate-x-5 transform rounded-full bg-white transition-transform" />
      </span>
    </button>
  );
}
