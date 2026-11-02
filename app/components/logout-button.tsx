"use client";

import { SignOut } from "@phosphor-icons/react";
import { logout } from "@/app/components/logout-action";
import { clearAllDrafts } from "@/lib/log-draft";

// Lokale kladder ligger kun i browseren, så de ryddes her, før serveren logger ud.
export function LogoutButton() {
  return (
    <form action={logout} onSubmit={() => {
      try { clearAllDrafts(localStorage); } catch { /* Logout skal virke, selv om lokal lagring er blokeret. */ }
    }}>
      <button
        type="submit"
        className="zet-panel flex w-full items-center gap-3 text-left text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:border-red-200 dark:hover:border-red-800"
      >
        <SignOut aria-hidden="true" size={20} />
        Log ud
      </button>
    </form>
  );
}
