// Skriver midlertidige testdata i databasen fra .env.local og rydder dem op igen.
// Kør kun med ZET_RUN_MERGE_TESTS=1:
//   node --import tsx --test tests/exercise-merge.integration.test.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { buildMergeStatements } from "../lib/exercise-merge";

config({ path: ".env.local", quiet: true });
const enabled = process.env.ZET_RUN_MERGE_TESTS === "1";
const sql = enabled ? neon(process.env.DATABASE_URL!) : null;
const run = randomUUID().slice(0, 8);
const users = [randomUUID(), randomUUID()];
const source = randomUUID();
const target = randomUUID();
const sourceName = `Zz Mergetest Curls ${run} (Machine)`;
const targetName = `Zz mergetest curl ${run} (Machine)`;
const merge = (pair = { sourceId: source, sourceName, targetId: target, targetName }) =>
  sql!.transaction(buildMergeStatements((text, params) => sql!.query(text, params), pair));

after(async () => {
  if (!sql) return;
  // Pas før brugere: sæt peger på øvelser uden cascade.
  await sql`delete from workout where user_id = any(${users}::uuid[])`;
  await sql`delete from training_program where user_id = any(${users}::uuid[])`;
  await sql`delete from exercise_alias where alias like ${`Zz Mergetest%${run}`}`;
  await sql`delete from "user" where id = any(${users}::uuid[])`;
});

test("Sammenlægning flytter alt til målet og sletter kilden", { skip: !enabled }, async () => {
  const db = sql!;
  for (const [index, id] of users.entries()) {
    await db`insert into "user" (id, email, name) values (${id}, ${`merge-${run}-${index}@example.invalid`}, 'Merge Test')`;
  }
  // Ikke delt, så testøvelserne aldrig ses af rigtige brugere.
  await db`insert into exercise (id, user_id, name, type, is_shared, group_name, equipment) values
    (${source}, ${users[0]}, ${sourceName}, 'strength', false, ${`Zz Mergetest Curls ${run}`}, 'machine'),
    (${target}, ${users[0]}, ${targetName}, 'strength', false, ${`Zz mergetest curl ${run}`}, 'machine')`;
  await db`insert into exercise_muscle_group (exercise_id, muscle_group) values (${source}, 'legs'), (${source}, 'core'), (${target}, 'legs')`;
  const workouts = [randomUUID(), randomUUID()];
  await db`insert into workout (id, user_id, date) values (${workouts[0]}, ${users[0]}, '2020-01-01'), (${workouts[1]}, ${users[1]}, '2020-01-01')`;
  await db`insert into workout_set (workout_id, exercise_id, reps, weight_kg) values
    (${workouts[0]}, ${source}, 8, 40), (${workouts[0]}, ${target}, 8, 45), (${workouts[1]}, ${source}, 10, 30)`;
  const programs = [randomUUID(), randomUUID()];
  await db`insert into training_program (id, user_id, name) values (${programs[0]}, ${users[0]}, 'Begge'), (${programs[1]}, ${users[1]}, 'Kun kilde')`;
  await db`insert into training_program_exercise (program_id, exercise_id, position) values
    (${programs[0]}, ${source}, 0), (${programs[0]}, ${target}, 1), (${programs[1]}, ${source}, 0)`;
  await db`insert into exercise_note (user_id, exercise_id, note) values
    (${users[0]}, ${source}, 'kilde'), (${users[0]}, ${target}, 'mål'), (${users[1]}, ${source}, 'kun kilde')`;

  // Forkert navn i vagten: intet må ændres.
  await assert.rejects(merge({ sourceId: source, sourceName: "Et andet navn", targetId: target, targetName }));
  assert.equal((await db`select count(*)::int as n from workout_set where exercise_id = ${source}`)[0].n, 2);

  await merge();

  assert.equal((await db`select count(*)::int as n from exercise where id = ${source}`)[0].n, 0);
  assert.equal((await db`select count(*)::int as n from workout_set where exercise_id = ${target}`)[0].n, 3);
  assert.deepEqual((await db`select program_id, count(*)::int as n from training_program_exercise where program_id = any(${programs}::uuid[]) and exercise_id = ${target} group by 1 order by 1`).map((row) => row.n), [1, 1]);
  assert.equal((await db`select count(*)::int as n from training_program_exercise where program_id = any(${programs}::uuid[])`)[0].n, 2);
  const notes = await db`select user_id, note from exercise_note where exercise_id = ${target}`;
  assert.equal(notes.find((row) => row.user_id === users[0])?.note, "mål\nkilde");
  assert.equal(notes.find((row) => row.user_id === users[1])?.note, "kun kilde");
  assert.deepEqual((await db`select muscle_group from exercise_muscle_group where exercise_id = ${target} order by 1`).map((row) => row.muscle_group).sort(), ["core", "legs"]);
  const alias = await db`select alias, base_name from exercise_alias where alias = ${`Zz Mergetest Curls ${run}`}`;
  assert.deepEqual(alias.map((row) => row.base_name), [`Zz mergetest curl ${run}`]);

  // Gentaget kørsel: kilden findes ikke længere, så vagten stopper den.
  await assert.rejects(merge());
});
