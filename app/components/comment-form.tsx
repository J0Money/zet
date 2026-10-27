"use client";

import { useActionState, useState } from "react";
import { commentAction, type CommunityActionState } from "@/app/community/actions";
import { MAX_COMMUNITY_TEXT } from "@/lib/community-input";

export function CommentForm({ postId, initialId }: { postId: string; initialId: string }) {
  const [body, setBody] = useState("");
  const [commentId, setCommentId] = useState(initialId);
  const [state, action, pending] = useActionState(async (previous: CommunityActionState, data: FormData) => {
    const result = await commentAction(previous, data);
    if (result.success) { setBody(""); setCommentId(crypto.randomUUID()); }
    return result;
  }, {});
  return <form action={action} className="space-y-3">
    <input type="hidden" name="postId" value={postId} />
    <input type="hidden" name="commentId" value={commentId} />
    <label className="block text-sm font-medium">Skriv en kommentar
      <textarea name="body" required maxLength={MAX_COMMUNITY_TEXT} rows={3} value={body}
        onChange={(event) => setBody(event.target.value)} disabled={pending}
        className="mt-2 w-full rounded-xl border border-zinc-300 bg-transparent p-3 dark:border-zinc-700" />
    </label>
    {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    {state.success && <p role="status" className="text-sm text-zinc-500">Din kommentar er tilføjet.</p>}
    <button disabled={pending || !body.trim()} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sender…" : "Send kommentar"}</button>
  </form>;
}
