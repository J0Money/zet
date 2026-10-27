import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityComment, communityPost, communityReaction, user } from "@/lib/db/schema";
import { communityText, isCommunityId } from "@/lib/community-input";
import { buildCommunitySummary } from "@/lib/community-summary";
import { getEntries, getExercises, getWorkoutById, getWorkouts } from "@/lib/workout-store";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function getSharePreview(userId: string, workoutId: string) {
  const workout = await getWorkoutById(userId, workoutId);
  if (!workout) return null;
  const [workouts, entries, exercises] = await Promise.all([getWorkouts(userId), getEntries(userId), getExercises(userId)]);
  return buildCommunitySummary(workout, workouts, entries, exercises);
}

export async function getSharedPost(userId: string, workoutId: string) {
  if (!isUuid(workoutId)) return null;
  const [post] = await db.select({ id: communityPost.id, summary: communityPost.summary, caption: communityPost.caption }).from(communityPost)
    .where(and(eq(communityPost.user_id, userId), eq(communityPost.workout_id, workoutId)));
  return post ?? null;
}

export async function shareWorkout(userId: string, workoutId: string, preview: string, caption = "") {
  const parsed = communityText(caption);
  if (parsed.error) return { error: parsed.error };
  const summary = await getSharePreview(userId, workoutId);
  if (!summary) return { error: "Kun dine egne afsluttede træninger med indhold kan deles." };
  if (JSON.stringify(summary) !== preview) return { error: "Træningen er ændret. Genindlæs siden og gennemgå opsummeringen igen." };
  // Dobbeltklik og gentagne requests må ikke give flere opslag eller ændre et delt opslag.
  await db.insert(communityPost).values({ user_id: userId, workout_id: workoutId, summary, caption: parsed.text }).onConflictDoNothing();
  return { success: true };
}

export async function withdrawPost(userId: string, postId: string) {
  if (!isUuid(postId)) return;
  await db.delete(communityPost).where(and(eq(communityPost.id, postId), eq(communityPost.user_id, userId)));
}

export async function setReaction(userId: string, postId: string, active: boolean) {
  if (!isUuid(postId)) return;
  if (!active) {
    await db.delete(communityReaction).where(and(eq(communityReaction.post_id, postId), eq(communityReaction.user_id, userId)));
    return;
  }
  // INSERT SELECT holder opslagstjek og indsættelse samlet. Egne opslag får ingen selvreaktion.
  await db.insert(communityReaction).select(db.select({
    id: sql<string>`gen_random_uuid()`.as("id"), post_id: communityPost.id, user_id: sql<string>`${userId}::uuid`.as("user_id"),
  }).from(communityPost).where(and(eq(communityPost.id, postId), ne(communityPost.user_id, userId))))
    .onConflictDoNothing();
}

// Kun autentificerede sider kalder denne funktion. Der læses udelukkende delte snapshots.
export async function getCommunityFeed(userId: string) {
  const posts = await db.select({
    id: communityPost.id, authorId: communityPost.user_id, name: user.name,
    summary: communityPost.summary,
    caption: communityPost.caption,
    image: user.image,
  }).from(communityPost).innerJoin(user, eq(user.id, communityPost.user_id))
    .orderBy(desc(communityPost.created_at), desc(communityPost.id)).limit(50);
  const reactions = posts.length ? await db.select({ postId: communityReaction.post_id, userId: communityReaction.user_id })
    .from(communityReaction).where(inArray(communityReaction.post_id, posts.map((post) => post.id))) : [];
  return posts.map(({ authorId, ...post }) => ({
    ...post, authorId, isMine: authorId === userId,
    count: reactions.filter((reaction) => reaction.postId === post.id).length,
    reacted: reactions.some((reaction) => reaction.postId === post.id && reaction.userId === userId),
  }));
}

export async function getCommunityPost(postId: string) {
  if (!isCommunityId(postId)) return null;
  const [post] = await db.select({ id: communityPost.id, userId: communityPost.user_id, name: user.name,
    summary: communityPost.summary, caption: communityPost.caption, image: user.image }).from(communityPost)
    .innerJoin(user, eq(user.id, communityPost.user_id)).where(eq(communityPost.id, postId));
  return post ?? null;
}

export async function getComments(postId: string) {
  return getCommentsForPosts([postId]);
}

export async function getCommentsForPosts(postIds: string[]) {
  const ids = postIds.filter(isCommunityId);
  if (!ids.length) return [];
  return db.select({ id: communityComment.id, postId: communityComment.post_id, userId: communityComment.user_id, name: user.name,
    body: communityComment.body, createdAt: communityComment.created_at, image: user.image }).from(communityComment)
    .innerJoin(user, eq(user.id, communityComment.user_id)).where(inArray(communityComment.post_id, ids))
    .orderBy(asc(communityComment.created_at), asc(communityComment.id));
}

export async function getDetailsPreview(userId: string, postId: string) {
  if (!isCommunityId(postId)) return null;
  const [post] = await db.select({ workoutId: communityPost.workout_id, summary: communityPost.summary }).from(communityPost)
    .where(and(eq(communityPost.id, postId), eq(communityPost.user_id, userId)));
  if (!post || post.summary.exercises) return null;
  const current = await getSharePreview(userId, post.workoutId);
  return current?.exercises ?? null;
}

export async function addWorkoutDetails(userId: string, postId: string, preview: string) {
  const exercises = await getDetailsPreview(userId, postId);
  if (!exercises) return { error: "Detaljerne kan ikke tilføjes. Genindlæs opslaget." };
  if (JSON.stringify(exercises) !== preview) return { error: "Træningen er ændret. Hent forhåndsvisningen igen." };
  // Tilføj kun detaljer. Bevar oprindelig opsummering, kommentarer og reaktioner.
  const updated = await db.update(communityPost).set({
    summary: sql`${communityPost.summary} || jsonb_build_object('exercises', ${JSON.stringify(exercises)}::jsonb)`,
  }).where(and(eq(communityPost.id, postId), eq(communityPost.user_id, userId), sql`not (${communityPost.summary} ? 'exercises')`))
    .returning({ id: communityPost.id });
  return updated.length ? { success: true } : { error: "Opslaget er ændret. Genindlæs siden." };
}

export async function addComment(userId: string, postId: string, commentId: string, body: string) {
  const parsed = communityText(body, true);
  if (parsed.error) return { error: parsed.error };
  if (!isCommunityId(postId) || !isCommunityId(commentId)) return { error: "Opslaget kunne ikke findes." };
  // INSERT SELECT undgår at kommentere et opslag, der er trukket tilbage.
  // Klientens UUID gør gentagne indsendelser idempotente.
  const rows = await db.insert(communityComment).select(db.select({
    id: sql<string>`${commentId}::uuid`.as("id"), post_id: communityPost.id,
    user_id: sql<string>`${userId}::uuid`.as("user_id"), body: sql<string>`${parsed.text}`.as("body"),
    created_at: sql<Date>`now()`.as("created_at"),
  }).from(communityPost).where(eq(communityPost.id, postId))).onConflictDoNothing().returning({ id: communityComment.id });
  if (rows.length) return { success: true, insertedId: rows[0].id };
  const [existing] = await db.select({ id: communityComment.id }).from(communityComment)
    .where(and(eq(communityComment.id, commentId), eq(communityComment.user_id, userId), eq(communityComment.post_id, postId)));
  return existing ? { success: true } : { error: "Opslaget er ikke længere tilgængeligt. Genindlæs siden." };
}

export async function deleteComment(userId: string, commentId: string) {
  if (!isCommunityId(commentId)) return;
  await db.delete(communityComment).where(and(eq(communityComment.id, commentId), eq(communityComment.user_id, userId)));
}

export async function deleteCaption(userId: string, postId: string) {
  if (!isCommunityId(postId)) return;
  await db.update(communityPost).set({ caption: "" }).where(and(eq(communityPost.id, postId), eq(communityPost.user_id, userId)));
}
