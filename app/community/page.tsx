import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/session";
import { getCommunityFeed, getCommentsForPosts, getCommunityLeaderboard } from "@/lib/community";
import { CommunityLeaderboard } from "@/app/components/community-leaderboard";
import { CommunityTabs } from "@/app/components/community-tabs";
import { CommunityComments } from "@/app/components/community-comments";
import { AddWorkoutDetails } from "@/app/components/add-workout-details";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { deleteCaptionAction } from "@/app/community/actions";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";
import { CommunityReaction, WithdrawPost } from "@/app/components/community-controls";
import { formatDateDanish } from "@/lib/dates";
import "./community.css";
import { ProfileAvatar } from "@/app/components/profile-avatar";

export const instant = false;

export default async function CommunityPage() {
  await connection();
  const user = await requireUser();
  const [posts, leaderboard] = await Promise.all([getCommunityFeed(user.id), getCommunityLeaderboard()]);
  const comments = await getCommentsForPosts(posts.map((post) => post.id));
  return <div className="zet-page community-page flex flex-col gap-6">
    <header className="zet-pageHeader">
      <p className="zet-brand">ZET</p><h1>Community</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Små sejre. Gode træninger. Sammen.</p>
    </header>
    <CommunityTabs ranked={<CommunityLeaderboard exercises={leaderboard} currentUserId={user.id} />} feed={<>
    <div className="community-share">
      <p>Giv hinanden lidt medvind.</p>
      <Link href="/history" className="community-share-button">Del træning <span aria-hidden="true">↗</span></Link>
    </div>
    {!posts.length ? <div className="zet-panel text-sm text-zinc-500 dark:text-zinc-400">Her er stille endnu. Den første delte træning starter fællesskabet.</div>
      : <ul className="community-feed">{posts.map((post) => <li key={post.id}>
        <article id={`post-${post.id}`} className="zet-panel community-post scroll-mt-4">
          <header className="community-post-header">
            <div className="community-avatar"><ProfileAvatar userId={post.authorId} image={post.image} name={post.name} /></div>
            <div className="community-author"><h2>{post.name}{post.isMine && <span className="community-you">Dig</span>}</h2><p>{formatDateDanish(post.summary.date)}</p></div>
            {post.isMine && <details className="community-options"><summary aria-label="Administrer dit opslag">•••</summary><div className="community-options-menu">
              {post.caption && <form action={deleteCaptionAction}>
            <input type="hidden" name="postId" value={post.id} />
            <ConfirmSubmitButton confirmMessage="Slet teksten til din træning?" className="min-h-11 text-sm text-red-600">Slet min tekst</ConfirmSubmitButton>
              </form>}
              <WithdrawPost postId={post.id} />
            </div></details>}
          </header>
          {post.caption && <p className="community-caption">{post.caption}</p>}
          <div className="community-workout"><CommunitySummaryCard summary={post.summary} compact /></div>
          {post.isMine && !post.summary.exercises && <div className="community-add-details"><AddWorkoutDetails postId={post.id} summary={post.summary} /></div>}
          <CommunityComments postId={post.id} userId={user.id} comments={comments.filter((comment) => comment.postId === post.id)} reaction={post.isMine ? <div>
            <p className="text-sm text-zinc-500">{post.count > 0 ? `${post.count} har sagt Stærkt!` : "Ingen reaktioner endnu"}</p>
          </div> : <CommunityReaction postId={post.id} count={post.count} reacted={post.reacted} />}
          />
        </article>
      </li>)}</ul>}
    {posts.length === 50 && <p className="text-sm text-zinc-500">De seneste 50 delte træninger vises.</p>}
    </>} />
  </div>;
}
