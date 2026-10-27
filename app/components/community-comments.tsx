import { randomUUID } from "node:crypto";
import type { getComments } from "@/lib/community";
import { deleteCommentAction } from "@/app/community/actions";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { CommentForm } from "@/app/components/comment-form";

export function CommunityComments({ postId, userId, comments }: {
  postId: string; userId: string; comments: Awaited<ReturnType<typeof getComments>>;
}) {
  return <section className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700" aria-label="Kommentarer">
    <h3 className="text-sm font-semibold">Kommentarer ({comments.length})</h3>
    {comments.length > 0 && <ul className="space-y-4">{comments.map((comment) => <li key={comment.id} className="space-y-1">
      <p className="text-sm font-semibold">{comment.name}{comment.userId === userId ? " (dig)" : ""}</p>
      <time className="text-xs text-zinc-500" dateTime={comment.createdAt.toISOString()}>{new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(comment.createdAt)}</time>
      <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
      {comment.userId === userId && <form action={deleteCommentAction}>
        <input type="hidden" name="commentId" value={comment.id} />
        <ConfirmSubmitButton confirmMessage="Slet din kommentar?" className="min-h-11 text-sm text-red-600">Slet min kommentar</ConfirmSubmitButton>
      </form>}
    </li>)}</ul>}
    <CommentForm postId={postId} initialId={randomUUID()} />
  </section>;
}
