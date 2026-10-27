import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getComments, getCommunityPost } from "@/lib/community";
import { CommunitySummaryCard } from "@/app/components/community-summary-card";
import { CommunityComments } from "@/app/components/community-comments";
import { AddWorkoutDetails } from "@/app/components/add-workout-details";
import { ProfileAvatar } from "@/app/components/profile-avatar";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { deleteCaptionAction } from "@/app/community/actions";

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
      <div className="flex items-center gap-3"><span className="overflow-hidden rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ProfileAvatar userId={post.userId} image={post.image} name={post.name} /></span><h1 className="text-xl font-semibold">{post.name}s træning</h1></div>
      {post.caption && <div className="space-y-2">
        <p className="whitespace-pre-wrap break-words">{post.caption}</p>
        {post.userId === user.id && <form action={deleteCaptionAction}>
          <input type="hidden" name="postId" value={id} />
          <ConfirmSubmitButton confirmMessage="Slet teksten til din træning?" className="min-h-11 text-sm text-red-600">Slet min tekst</ConfirmSubmitButton>
        </form>}
      </div>}
      <CommunitySummaryCard summary={post.summary} />
      {post.userId === user.id && !post.summary.exercises && <AddWorkoutDetails postId={id} summary={post.summary} />}
    </article>
    <div className="zet-panel"><CommunityComments postId={id} userId={user.id} comments={comments} /></div>
  </div>;
}
