import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityPost, communityReaction, user } from "@/lib/db/schema";
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
  const [post] = await db.select({ id: communityPost.id, summary: communityPost.summary }).from(communityPost)
    .where(and(eq(communityPost.user_id, userId), eq(communityPost.workout_id, workoutId)));
  return post ?? null;
}

export async function shareWorkout(userId: string, workoutId: string, preview: string) {
  const summary = await getSharePreview(userId, workoutId);
  if (!summary) return { error: "Kun dine egne afsluttede træninger med indhold kan deles." };
  if (JSON.stringify(summary) !== preview) return { error: "Træningen er ændret. Genindlæs siden og gennemgå opsummeringen igen." };
  // Dobbeltklik og gentagne requests må ikke give flere opslag eller ændre et delt opslag.
  await db.insert(communityPost).values({ user_id: userId, workout_id: workoutId, summary }).onConflictDoNothing();
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
  }).from(communityPost).innerJoin(user, eq(user.id, communityPost.user_id))
    .orderBy(desc(communityPost.created_at), desc(communityPost.id)).limit(50);
  const reactions = posts.length ? await db.select({ postId: communityReaction.post_id, userId: communityReaction.user_id })
    .from(communityReaction).where(inArray(communityReaction.post_id, posts.map((post) => post.id))) : [];
  return posts.map(({ authorId, ...post }) => ({
    ...post, isMine: authorId === userId,
    count: reactions.filter((reaction) => reaction.postId === post.id).length,
    reacted: reactions.some((reaction) => reaction.postId === post.id && reaction.userId === userId),
  }));
}
