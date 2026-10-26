import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/session";
import { getCommunityFeed } from "@/lib/community";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";
import { CommunityReaction, WithdrawPost } from "@/app/components/community-controls";

export const instant = false;

export default async function CommunityPage() {
  await connection();
  const user = await requireUser();
  const posts = await getCommunityFeed(user.id);
  return <div className="zet-page flex flex-col gap-6">
    <header className="zet-pageHeader">
      <p className="zet-brand">ZET</p><h1>Community</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Jeres træninger og personlige rekorder. Kun for jer med en ZET-konto.</p>
    </header>
    <div className="zet-panel space-y-2">
      <h2 className="zet-sectionTitle">Del en træning, giv et skulderklap</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Intet deles automatisk. Afslut et pas, eller åbn en afsluttet træning i historikken for at dele den.</p>
      <Link href="/history" className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 dark:text-indigo-400">Vælg fra din historik →</Link>
    </div>
    {!posts.length ? <div className="zet-panel text-sm text-zinc-500 dark:text-zinc-400">Her er stille endnu. Den første delte træning starter fællesskabet.</div>
      : <ul className="flex flex-col gap-4">{posts.map((post) => <li key={post.id}>
        <article className="zet-panel space-y-4">
          <h2 className="font-semibold">{post.name}{post.isMine ? " (dig)" : ""}</h2>
          <CommunitySummaryCard summary={post.summary} />
          {post.isMine ? <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">{post.count} har sagt Stærkt!</p><WithdrawPost postId={post.id} />
          </div> : <CommunityReaction postId={post.id} count={post.count} reacted={post.reacted} />}
        </article>
      </li>)}</ul>}
    {posts.length === 50 && <p className="text-sm text-zinc-500">De seneste 50 delte træninger vises.</p>}
  </div>;
}
