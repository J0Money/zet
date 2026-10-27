import { randomUUID } from "node:crypto";
import type { getComments } from "@/lib/community";
import { deleteCommentAction } from "@/app/community/actions";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { CommentForm } from "@/app/components/comment-form";
import { ProfileAvatar } from "@/app/components/profile-avatar";

export function CommunityComments({ postId, userId, comments }: {
  postId: string; userId: string; comments: Awaited<ReturnType<typeof getComments>>;
}) {
  const renderComment = (comment: typeof comments[number]) => <li key={comment.id} className="community-comment space-y-1">
      <div className="community-comment-bubble">
      <div className="mb-1 flex items-center gap-2"><span className="overflow-hidden rounded-full bg-indigo-50 text-xs text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ProfileAvatar userId={comment.userId} image={comment.image} name={comment.name} size={28} /></span><p className="text-sm font-semibold">{comment.name}{comment.userId === userId ? " (dig)" : ""}</p></div>
      <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
      </div><div className="community-comment-meta">
      <time className="text-xs text-zinc-500" dateTime={comment.createdAt.toISOString()}>{new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(comment.createdAt)}</time>
      {comment.userId === userId && <form action={deleteCommentAction}>
        <input type="hidden" name="commentId" value={comment.id} />
        <ConfirmSubmitButton confirmMessage="Slet din kommentar?" className="min-h-11 text-xs text-zinc-500 hover:text-red-600">Slet</ConfirmSubmitButton>
      </form>}
      </div>
    </li>;
  return <section className="community-comments space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700" aria-label="Kommentarer">
    <h3 className="text-sm font-semibold">Kommentarer <span className="community-comment-count">{comments.length}</span></h3>
    {comments.length > 2 && <details className="community-older-comments">
      <summary className="min-h-11 cursor-pointer content-center text-sm text-zinc-500">Vis {comments.length - 2} tidligere kommentarer</summary>
      <ul className="space-y-3">{comments.slice(0, -2).map(renderComment)}</ul>
    </details>}
    {comments.length > 0 && <ul className="space-y-3">{comments.slice(-2).map(renderComment)}</ul>}
    <CommentForm postId={postId} initialId={randomUUID()} />
  </section>;
}
