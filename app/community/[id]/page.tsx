import { randomUUID } from "node:crypto";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getComments, getCommunityPost } from "@/lib/community";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";
import { CommentForm } from "@/app/components/comment-form";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { deleteCaptionAction, deleteCommentAction } from "@/app/community/actions";

export const instant = false;

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const post = await getCommunityPost(id);
  if (!post) notFound();
  const comments = await getComments(id);
  return <div className="zet-page flex flex-col gap-6">
    <Link href="/community" className="text-sm text-indigo-600 dark:text-indigo-400">← Tilbage til Community</Link>
    <article className="zet-panel space-y-4">
      <h1 className="text-xl font-semibold">{post.name}s træning</h1>
      {post.caption && <div className="space-y-2">
        <p className="whitespace-pre-wrap break-words">{post.caption}</p>
        {post.userId === user.id && <form action={deleteCaptionAction}>
          <input type="hidden" name="postId" value={id} />
          <ConfirmSubmitButton confirmMessage="Slet teksten til din træning?" className="min-h-11 text-sm text-red-600">Slet min tekst</ConfirmSubmitButton>
        </form>}
      </div>}
      <CommunitySummaryCard summary={post.summary} />
    </article>
    <section className="zet-panel space-y-4" aria-label="Kommentarer">
      <h2 className="zet-sectionTitle">Kommentarer ({comments.length})</h2>
      {!comments.length && <p className="text-sm text-zinc-500">Ingen kommentarer endnu.</p>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">{comments.map((comment) => <li key={comment.id} className="space-y-2 py-4">
        <p className="text-sm font-semibold">{comment.name}{comment.userId === user.id ? " (dig)" : ""}</p>
        <time className="text-xs text-zinc-500" dateTime={comment.createdAt.toISOString()}>{new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(comment.createdAt)}</time>
        <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
        {comment.userId === user.id && <form action={deleteCommentAction}>
          <input type="hidden" name="commentId" value={comment.id} />
          <ConfirmSubmitButton confirmMessage="Slet din kommentar?" className="min-h-11 text-sm text-red-600">Slet min kommentar</ConfirmSubmitButton>
        </form>}
      </li>)}</ul>
      <CommentForm postId={id} initialId={randomUUID()} />
    </section>
  </div>;
}
