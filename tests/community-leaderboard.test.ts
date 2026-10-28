import assert from "node:assert/strict";
import { test } from "node:test";
import { bigFiveLeaderboards, buildLeaderboard, type LeaderboardPost } from "../lib/community-leaderboard";
import { displayExerciseName } from "../lib/exercise-names";
function post(userId: string, weightKg: number, reps = 5, exercise = "Bænkpres (Stang)", id = userId): LeaderboardPost {
 return { id, userId, name: userId, image: null, summary: { date: "2026-10-28", duration: null, strengthSets: 1, cardioSessions: 0, records: [], exercises: [{ name: exercise, sets: [{ kind: "strength", weightKg, reps }] }] } };
}
test("Displayed Danish equipment preserves Ranked categories", () => {
 assert.equal(displayExerciseName("Squat (Barbell)"), "Squat (Stang)");
 assert.equal(displayExerciseName("Bench press (Machine)"), "Bench press (Maskine)");
 assert.equal(displayExerciseName("Lat pulldown (Cable)"), "Lat pulldown (Kabel)");
 const lists = bigFiveLeaderboards(buildLeaderboard([post("a", 70, 10, displayExerciseName("Squat (Barbell)"))]));
 assert.equal(lists[0].results[0].weightKg, 70);
});
test("Big 5 always shows five lists and only uses explicit barbell results", () => {
 const lists = bigFiveLeaderboards(buildLeaderboard([
   post("machine", 200, 5, "Bench press (Machine)"), post("barbell", 100),
   post("unknown", 300, 5, "Squat"), post("press", 60, 5, "Overhead press (Barbell)"),
   post("row", 80, 5, "Barbell row (Barbell)"),
 ]));
 assert.equal(lists.length, 5);
 assert.deepEqual(lists.map((list) => list.results.map((result) => result.userId)), [[], ["barbell"], [], ["press"], ["row"]]);
 assert.equal(bigFiveLeaderboards([]).length, 5);
});
test("Top 3 uses the best set per person, weight before reps and translated names", () => {
 const board = buildLeaderboard([post("a", 90, 20), post("a", 100, 3, "Bench press (Barbell)", "a2"), post("b", 100, 5), post("c", 110, 1), post("d", 80)]);
 assert.equal(board.length, 1);
 assert.deepEqual(board[0].variants[0].results.map((r) => [r.userId, r.weightKg, r.reps]), [["c",110,1],["b",100,5],["a",100,3]]);
});
test("Equipment stays separate; identical results share rank with stable ordering", () => {
 const posts = [post("b",100),post("a",100),post("c",90),post("d",80),post("machine",200,5,"Bench press (Machine)"),post("unknown",300,5,"Bench press")];
 const board = buildLeaderboard(posts);
 assert.equal(board[0].variants.length, 3);
 assert.deepEqual(board[0].variants.find((v) => v.equipment === "barbell")!.results.map((r) => [r.userId,r.rank]), [["a",1],["b",1],["c",3]]);
 assert.deepEqual(buildLeaderboard(posts.slice().reverse()), board);
});
test("Legacy record-only snapshots, cardio and invalid numbers do not qualify", () => {
 const old = post("old",200); delete old.summary.exercises;
 old.summary.records = [{ exercise:"Bænkpres (Stang)", weightKg:200,reps:10,previousWeightKg:100,previousReps:10 }];
 const cardio = post("runner",1); cardio.summary.exercises![0].sets = [{kind:"cardio",distanceKm:5,durationSec:1200}];
 assert.deepEqual(buildLeaderboard([old,cardio,post("bad",NaN),post("bad2",100,0)]), []);
});
