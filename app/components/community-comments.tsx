import { randomUUID } from "node:crypto";
import type { ReactNode } from "react";
import type { getComments } from "@/lib/community";
import { deleteCommentAction } from "@/app/community/actions";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { CommentForm } from "@/app/components/comment-form";
import { ProfileAvatar } from "@/app/components/profile-avatar";

export function CommunityComments({ postId, userId, comments, reaction }: {
  postId: string; userId: string; comments: Awaited<ReturnType<typeof getComments>>; reaction?: ReactNode;
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
    <div className="community-action-row">
      {reaction && <div className="community-reactions">{reaction}</div>}
      <details className="community-compose" open={reaction ? undefined : true}>
        <summary className="community-comment-trigger min-h-11 cursor-pointer content-center text-sm font-semibold">Kommentér <span className="community-comment-count">{comments.length}</span></summary>
        <div className="community-compose-form"><CommentForm postId={postId} initialId={randomUUID()} /></div>
      </details>
    </div>
    {comments.length > 1 && <details className="community-older-comments">
      <summary className="min-h-11 cursor-pointer content-center text-sm text-zinc-500">Se {comments.length - 1} tidligere {comments.length === 2 ? "kommentar" : "kommentarer"}</summary>
      <ul className="space-y-3">{comments.slice(0, -1).map(renderComment)}</ul>
    </details>}
    {comments.length > 0 && <ul className="space-y-3">{comments.slice(-1).map(renderComment)}</ul>}
  </section>;
}
