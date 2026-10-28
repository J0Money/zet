"use client";

import { useState, type ReactNode } from "react";

export function CommunityTabs({ feed, ranked }: { feed: ReactNode; ranked: ReactNode }) {
  const [tab, setTab] = useState<"feed" | "ranked">("feed");
  return <div className="flex flex-col gap-5">
    <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900" role="group" aria-label="Community-visning">
      {(["feed", "ranked"] as const).map((value) => <button key={value} type="button" aria-pressed={tab === value} aria-controls={`community-${value}-panel`} onClick={() => setTab(value)}
        className={`min-h-11 flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${tab === value
          ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
          : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}>
        {value === "feed" ? "Feed" : "Ranked"}
      </button>)}
    </div>
    <div id="community-feed-panel" hidden={tab !== "feed"}><div className="flex flex-col gap-6">{feed}</div></div>
    <div id="community-ranked-panel" hidden={tab !== "ranked"}>{ranked}</div>
  </div>;
}
