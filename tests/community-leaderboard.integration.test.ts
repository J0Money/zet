import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
test("Leaderboard only uses published snapshots and removes withdrawn results", {skip:process.env.ZET_RUN_COMMUNITY_TESTS !== "1"}, async()=>{
 config({path:".env.local",quiet:true});
 const {db}=await import("../lib/db");
 const {user,workout,exercise,workoutSet,communityPost}=await import("../lib/db/schema");
 const {getCommunityLeaderboard,withdrawPost}=await import("../lib/community");
 const owner=randomUUID(), shared=randomUUID(), privateWorkout=randomUUID(), exerciseId=randomUUID();
 const name=`Leaderboardtest ${randomUUID()}`;
 try {
  await db.insert(user).values({id:owner,name:"Ranglistetest",email:`${owner}@example.invalid`});
  await db.insert(exercise).values({id:exerciseId,user_id:owner,name,type:"strength"});
  await db.insert(workout).values([{id:shared,user_id:owner,date:"2026-10-28"},{id:privateWorkout,user_id:owner,date:"2026-10-28"}]);
  await db.insert(workoutSet).values({workout_id:privateWorkout,exercise_id:exerciseId,reps:20,weight_kg:999});
  assert.equal((await getCommunityLeaderboard()).filter((e)=>e.name===name).length,0);
  const [published]=await db.insert(communityPost).values({user_id:owner,workout_id:shared,summary:{date:"2026-10-28",duration:null,strengthSets:1,cardioSessions:0,records:[],exercises:[{name:`${name} (Barbell)`,sets:[{kind:"strength",weightKg:50,reps:10}]}]}}).returning();
  const board=(await getCommunityLeaderboard()).find((e)=>e.name===name)!;
  assert.equal(board.variants[0].results.length,1);
  assert.equal(board.variants[0].results[0].weightKg,50);
  await withdrawPost(owner,published.id);
  assert.equal((await getCommunityLeaderboard()).filter((e)=>e.name===name).length,0);
 } finally {
  await db.delete(workout).where(inArray(workout.id,[shared,privateWorkout]));
  await db.delete(exercise).where(eq(exercise.id,exerciseId));
  await db.delete(user).where(eq(user.id,owner));
 }
});
