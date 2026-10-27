import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/session";
import { getCommunityFeed, getCommentsForPosts } from "@/lib/community";
import { CommunityComments } from "@/app/components/community-comments";
import { AddWorkoutDetails } from "@/app/components/add-workout-details";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { deleteCaptionAction } from "@/app/community/actions";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";
import { CommunityReaction, WithdrawPost } from "@/app/components/community-controls";

export const instant = false;

export default async function CommunityPage() {
  await connection();
  const user = await requireUser();
  const posts = await getCommunityFeed(user.id);
  const comments = await getCommentsForPosts(posts.map((post) => post.id));
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
        <article id={`post-${post.id}`} className="zet-panel scroll-mt-4 space-y-4">
          <h2 className="font-semibold">{post.name}{post.isMine ? " (dig)" : ""}</h2>
          {post.caption && <p className="whitespace-pre-wrap break-words text-sm">{post.caption}</p>}
          {post.caption && post.isMine && <form action={deleteCaptionAction}>
            <input type="hidden" name="postId" value={post.id} />
            <ConfirmSubmitButton confirmMessage="Slet teksten til din træning?" className="min-h-11 text-sm text-red-600">Slet min tekst</ConfirmSubmitButton>
          </form>}
          <CommunitySummaryCard summary={post.summary} />
          {post.isMine && !post.summary.exercises && <AddWorkoutDetails postId={post.id} summary={post.summary} />}
          {post.isMine ? <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">{post.count} har sagt Stærkt!</p><WithdrawPost postId={post.id} />
          </div> : <CommunityReaction postId={post.id} count={post.count} reacted={post.reacted} />}
          <CommunityComments postId={post.id} userId={user.id} comments={comments.filter((comment) => comment.postId === post.id)} />
        </article>
      </li>)}</ul>}
    {posts.length === 50 && <p className="text-sm text-zinc-500">De seneste 50 delte træninger vises.</p>}
  </div>;
}
