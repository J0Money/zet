// Skriver midlertidige testdata i databasen fra .env.local og rydder dem op igen.
// Kør kun med ZET_RUN_APPROVAL_TESTS=1:
//   node --conditions=react-server --import tsx --test tests/exercise-approval.integration.test.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const enabled = process.env.ZET_RUN_APPROVAL_TESTS === "1";
const sql = enabled ? neon(process.env.DATABASE_URL!) : null;
const users = [randomUUID(), randomUUID()];
const run = randomUUID().slice(0, 6);
const n = (label: string) => `Zz AT ${label} ${run}`;
const visibleTo = async (userId: string, name: string) =>
  (await sql!`select count(*)::int as c from exercise where name = ${name} and (user_id is null or user_id = ${userId}::uuid or is_shared)`)[0].c;

after(async () => {
  if (!sql) return;
  // Pas før brugere: sæt peger på øvelser uden cascade.
  await sql`delete from workout where user_id = any(${users}::uuid[])`;
  await sql`delete from exercise_alias where alias like ${`Zz AT %${run}`}`;
  await sql`delete from exercise where name like ${`Zz AT %${run}%`}`;
  await sql`delete from "user" where id = any(${users}::uuid[])`;
});

test("Godkend, læg sammen og slet øvelser, brugere har oprettet", { skip: !enabled }, async () => {
  const db = sql!;
  const { approvePendingExercise, mergePendingExercise, deletePendingExercise, listPendingExercises, countPendingExercises } =
    await import("../lib/exercise-approval");
  for (const [index, id] of users.entries()) {
    await db`insert into "user" (id, email, name) values (${id}, ${`approve-${run}-${index}@example.invalid`}, 'Approve Test')`;
  }
  const id = () => randomUUID();
  const ex = { target: id(), altBar: id(), altDb: id(), fresh: id(), same: id(), unused: id(), used: id() };
  await db`insert into exercise (id, user_id, name, type, is_shared, group_name, equipment) values
    (${ex.target}, ${users[0]}, ${n("Main (Barbell)")}, 'strength', true, ${n("Main")}, 'barbell'),
    (${ex.altBar}, ${users[1]}, ${n("Alt (Barbell)")}, 'strength', false, ${n("Alt")}, 'barbell'),
    (${ex.altDb}, ${users[1]}, ${n("Alt (Dumbbells)")}, 'strength', false, ${n("Alt")}, 'dumbbells'),
    (${ex.fresh}, ${users[1]}, ${n("New")}, 'strength', false, null, null),
    (${ex.same}, ${users[1]}, ${n("main").toLowerCase()}, 'strength', false, null, null),
    (${ex.unused}, ${users[1]}, ${n("Unused")}, 'strength', false, null, null),
    (${ex.used}, ${users[1]}, ${n("Used")}, 'strength', false, null, null)`;
  await db`insert into exercise_muscle_group (exercise_id, muscle_group) values (${ex.altBar}, 'chest'), (${ex.altDb}, 'chest'), (${ex.fresh}, 'legs')`;
  const workout = id();
  await db`insert into workout (id, user_id, date) values (${workout}, ${users[1]}, '2020-01-01')`;
  await db`insert into workout_set (workout_id, exercise_id, reps, weight_kg) values
    (${workout}, ${ex.altBar}, 5, 50), (${workout}, ${ex.altDb}, 8, 20), (${workout}, ${ex.used}, 3, 10)`;

  // Privat, til den er godkendt: kun ejeren ser den.
  assert.equal(await visibleTo(users[0], n("New")), 0);
  assert.equal(await visibleTo(users[1], n("New")), 1);
  const listed = (await listPendingExercises()).filter((item) => item.base.includes(run));
  assert.equal(listed.length, 5);
  assert.equal(listed.find((item) => item.base === n("Alt"))?.variants.length, 2);
  assert.ok((await countPendingExercises()) >= 5);

  // Ugyldigt input og forkert ejer ændrer intet.
  assert.deepEqual(await approvePendingExercise("ikke-et-id", "strength", n("New")), { ok: false, error: "invalid" });
  assert.deepEqual(await approvePendingExercise(users[0], "strength", n("New")), { ok: false, error: "changed" });
  assert.equal(await visibleTo(users[0], n("New")), 0);

  // Godkend: deles med alle.
  assert.deepEqual(await approvePendingExercise(users[1], "strength", n("New")), { ok: true });
  assert.equal(await visibleTo(users[0], n("New")), 1);

  // En bevægelse, der allerede findes som delt, kan ikke godkendes igen.
  assert.deepEqual(await approvePendingExercise(users[1], "strength", n("main").toLowerCase()), { ok: false, error: "exists" });
  assert.equal(await visibleTo(users[0], n("main").toLowerCase()), 0);

  // Læg sammen: stang flyttes ind i målets stang, dumbbells bliver ny delt variant.
  assert.deepEqual(await mergePendingExercise(users[1], "strength", n("Alt"), n("Main")), { ok: true });
  assert.equal((await db`select count(*)::int as c from exercise where id = ${ex.altBar}`)[0].c, 0);
  assert.equal((await db`select count(*)::int as c from workout_set where exercise_id = ${ex.target}`)[0].c, 1);
  const moved = (await db`select name, group_name, is_shared, equipment::text as equipment from exercise where id = ${ex.altDb}`)[0];
  assert.deepEqual(moved, { name: `${n("Main")} (Dumbbells)`, group_name: n("Main"), is_shared: true, equipment: "dumbbells" });
  assert.equal((await db`select count(*)::int as c from workout_set where exercise_id = ${ex.altDb}`)[0].c, 1);
  assert.deepEqual((await db`select base_name from exercise_alias where alias = ${n("Alt")}`).map((row) => row.base_name), [n("Main")]);
  assert.equal(await visibleTo(users[0], `${n("Main")} (Dumbbells)`), 1);
  assert.deepEqual(await mergePendingExercise(users[1], "strength", n("Alt"), n("Main")), { ok: false, error: "changed" });

  // Slet: kun hvis ingen har brugt den.
  assert.deepEqual(await deletePendingExercise(users[1], "strength", n("Used")), { ok: false, error: "used" });
  assert.equal((await db`select count(*)::int as c from exercise where id = ${ex.used}`)[0].c, 1);
  assert.deepEqual(await deletePendingExercise(users[1], "strength", n("Unused")), { ok: true });
  assert.equal((await db`select count(*)::int as c from exercise where id = ${ex.unused}`)[0].c, 0);
});
