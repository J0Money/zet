import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";

test("Community deler kun godkendte pas og afgrænser ændringer til den rigtige bruger", {
  skip: process.env.ZET_RUN_COMMUNITY_TESTS !== "1",
}, async () => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, exercise, workout, workoutSet, communityPost, communityReaction } = await import("../lib/db/schema");
  const { getSharePreview, getCommunityFeed, getSharedPost, shareWorkout, withdrawPost, setReaction } = await import("../lib/community");
  const { endActiveWorkout } = await import("../lib/workout-store");
  const owner = randomUUID(), friend = randomUUID(), exerciseId = randomUUID();
  const past = randomUUID(), current = randomUUID(), active = randomUUID();
  try {
    await db.insert(user).values([owner, friend].map((id) => ({ id, email: `community-${id}@example.invalid`, name: "Communitytest" })));
    await db.insert(exercise).values({ id: exerciseId, user_id: owner, name: "Testøvelse", type: "strength" });
    await db.insert(workout).values([
      { id: past, user_id: owner, date: "2026-10-25", notes: "Må ikke deles" },
      { id: current, user_id: owner, date: "2026-10-26", notes: "Privat", started_at: new Date("2026-10-26T10:00:00Z"), ended_at: new Date("2026-10-26T11:00:00Z") },
      { id: active, user_id: owner, date: "2026-10-26", started_at: new Date() },
    ]);
    await db.insert(workoutSet).values([
      { workout_id: past, exercise_id: exerciseId, reps: 8, weight_kg: 40 },
      { workout_id: current, exercise_id: exerciseId, reps: 8, weight_kg: 45 },
      { workout_id: active, exercise_id: exerciseId, reps: 8, weight_kg: 50 },
    ]);
    assert.equal(await getSharePreview(friend, current), null);
    assert.equal(await getSharePreview(owner, active), null);
    assert.equal(await getSharedPost(owner, current), null);
    const preview = await getSharePreview(owner, current);
    assert.ok(preview);
    assert.ok((await shareWorkout(friend, current, JSON.stringify(preview))).error);
    assert.ok((await shareWorkout(owner, active, "{}")).error);
    assert.ok((await shareWorkout(owner, current, "{}")).error);
    await shareWorkout(owner, current, JSON.stringify(preview));
    await shareWorkout(owner, current, JSON.stringify(preview));
    const [post] = await db.select().from(communityPost).where(eq(communityPost.workout_id, current));
    assert.ok(post);
    assert.equal((await db.select().from(communityPost).where(eq(communityPost.workout_id, current))).length, 1);
    assert.equal(JSON.stringify(post.summary).includes("Privat"), false);
    await setReaction(owner, post.id, true);
    assert.equal((await db.select().from(communityReaction).where(eq(communityReaction.post_id, post.id))).length, 0);
    await setReaction(friend, post.id, true);
    await setReaction(friend, post.id, true);
    const feedPost = (await getCommunityFeed(friend)).find((item) => item.id === post.id)!;
    assert.equal(feedPost.count, 1);
    assert.equal(feedPost.reacted, true);
    assert.equal("workout_id" in feedPost, false);
    await withdrawPost(friend, post.id);
    assert.ok(await getSharedPost(owner, current));
    await db.update(workoutSet).set({ weight_kg: 60 }).where(eq(workoutSet.workout_id, current));
    assert.deepEqual((await getSharedPost(owner, current))?.summary, preview);
    await setReaction(friend, post.id, false);
    assert.equal((await getCommunityFeed(friend)).find((item) => item.id === post.id)?.count, 0);
    await setReaction(friend, post.id, true);
    await withdrawPost(owner, post.id);
    assert.equal(await getSharedPost(owner, current), null);
    assert.equal((await db.select().from(communityReaction).where(eq(communityReaction.post_id, post.id))).length, 0);
    assert.equal((await getCommunityFeed(friend)).some((item) => item.id === post.id), false);
    assert.equal(await endActiveWorkout(owner, current), false);
    assert.equal(await getSharePreview(owner, active), null);
    assert.equal(await endActiveWorkout(owner, active), true);
  } catch {
    throw new Error("Communitytesten fejlede; databasedetaljer er skjult.");
  } finally {
    await db.delete(workout).where(inArray(workout.user_id, [owner, friend]));
    await db.delete(user).where(inArray(user.id, [owner, friend]));
  }
});
