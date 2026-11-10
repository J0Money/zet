import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";

// Kør med: ZET_RUN_DELETE_TESTS=1 node --conditions=react-server --import tsx --test tests/account-deletion.integration.test.ts
// Bruger kun midlertidige brugere under example.invalid og rydder alt op bagefter.
test("Kontosletning", { skip: process.env.ZET_RUN_DELETE_TESTS !== "1" }, async (t) => {
  config({ path: ".env.local", quiet: true });
  // Testen må aldrig røre det rigtige billedlager.
  delete process.env.S3_ENDPOINT;
  const { db } = await import("../lib/db");
  const { auth } = await import("../lib/auth");
  const { deleteAccount, buildDeletionStatements, DELETE_ATTEMPT_LIMIT } = await import("../lib/account-deletion");
  const q = (text: string, params: unknown[] = []) => db.$client.query(text, params) as Promise<Record<string, unknown>[]>;

  const tag = randomUUID().slice(0, 8);
  const emailFor = (id: string) => `zet-delete-${tag}-${id}@example.invalid`;
  const [A, B, D, E, G] = Array.from({ length: 5 }, () => randomUUID());
  const passwords = new Map<string, string>();
  const createdExercises: string[] = [];
  const allUsers = [A, B, D, E, G];

  async function makeUser(id: string, role: "admin" | "member") {
    const password = randomBytes(24).toString("hex");
    passwords.set(id, password);
    await q(`INSERT INTO "user" (id, email, name, role) VALUES ($1::uuid, $2, 'Slettetest', $3::user_role)`, [id, emailFor(id), role]);
    await q(`INSERT INTO account (id, user_id, account_id, provider_id, password, updated_at) VALUES ($1::uuid, $2::uuid, $2, 'credential', $3, now())`,
      [randomUUID(), id, await hashPassword(password)]);
  }
  async function makeExercise(owner: string | null, name: string, type: "strength" | "cardio" = "strength") {
    const id = randomUUID();
    createdExercises.push(id);
    await q(`INSERT INTO exercise (id, user_id, name, type, is_shared) VALUES ($1::uuid, $2::uuid, $3, $4::exercise_type, true)`, [id, owner, `${name} ${tag}`, type]);
    await q(`INSERT INTO exercise_muscle_group (exercise_id, muscle_group) VALUES ($1::uuid, 'chest')`, [id]);
    return id;
  }
  async function makeWorkout(userId: string, withEnd = true) {
    const id = randomUUID();
    await q(`INSERT INTO workout (id, user_id, date, notes, started_at, ended_at) VALUES ($1::uuid, $2::uuid, '2026-11-01', 'privat note', now() - interval '3 hours', $3)`,
      [id, userId, withEnd ? new Date().toISOString() : null]);
    return id;
  }
  const addSet = (workoutId: string, exerciseId: string) =>
    q(`INSERT INTO workout_set (workout_id, exercise_id, reps, weight_kg) VALUES ($1::uuid, $2::uuid, 8, 50)`, [workoutId, exerciseId]);

  // Antal rækker, der hører til en bruger, pr. tabel. Bevidst talt, ikke kun "findes".
  async function counts(id: string, email: string) {
    const [row] = await q(`SELECT
      (SELECT count(*) FROM "user" WHERE id = $1::uuid)::int AS "user",
      (SELECT count(*) FROM session WHERE user_id = $1::uuid)::int AS session,
      (SELECT count(*) FROM account WHERE user_id = $1::uuid)::int AS account,
      (SELECT count(*) FROM verification WHERE value = $1::text)::int AS verification,
      (SELECT count(*) FROM invitation WHERE lower(email) = lower($2))::int AS invitation,
      (SELECT count(*) FROM invitation_attempt ia JOIN invitation i ON i.id = ia.invitation_id WHERE lower(i.email) = lower($2))::int AS invitation_attempt,
      (SELECT count(*) FROM rate_limit WHERE key = 'delete-account:' || $1::text)::int AS rate_limit,
      (SELECT count(*) FROM workout WHERE user_id = $1::uuid)::int AS workout,
      (SELECT count(*) FROM workout_set s JOIN workout w ON w.id = s.workout_id WHERE w.user_id = $1::uuid)::int AS workout_set,
      (SELECT count(*) FROM workout_cardio c JOIN workout w ON w.id = c.workout_id WHERE w.user_id = $1::uuid)::int AS workout_cardio,
      (SELECT count(*) FROM exercise_note WHERE user_id = $1::uuid)::int AS exercise_note,
      (SELECT count(*) FROM training_program WHERE user_id = $1::uuid)::int AS training_program,
      (SELECT count(*) FROM training_program_exercise pe JOIN training_program p ON p.id = pe.program_id WHERE p.user_id = $1::uuid)::int AS training_program_exercise,
      (SELECT count(*) FROM community_post WHERE user_id = $1::uuid)::int AS community_post,
      (SELECT count(*) FROM community_reaction WHERE user_id = $1::uuid)::int AS community_reaction,
      (SELECT count(*) FROM community_comment WHERE user_id = $1::uuid)::int AS community_comment,
      (SELECT count(*) FROM push_subscription WHERE user_id = $1::uuid)::int AS push_subscription,
      (SELECT count(*) FROM log_submission WHERE user_id = $1::uuid)::int AS log_submission,
      (SELECT count(*) FROM exercise WHERE user_id = $1::uuid)::int AS exercise,
      (SELECT count(*) FROM exercise_muscle_group mg JOIN exercise e ON e.id = mg.exercise_id WHERE e.user_id = $1::uuid)::int AS exercise_muscle_group`,
      [id, email]);
    return row as Record<string, number>;
  }
  const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
  const exerciseOwner = async (id: string) => (await q(`SELECT user_id FROM exercise WHERE id = $1::uuid`, [id]))[0];

  try {
    for (const [id, role] of [[A, "member"], [B, "member"], [D, "admin"], [E, "admin"], [G, "member"]] as const) await makeUser(id, role);
    const [builtin] = await q(`SELECT id FROM exercise WHERE user_id IS NULL AND type = 'strength' LIMIT 1`);
    const builtinId = builtin.id as string;
    const builtinCountBefore = (await q(`SELECT count(*)::int AS n FROM exercise WHERE user_id IS NULL`))[0].n as number;

    // --- Opsætning: A har data i alle tabeller, B bruger nogle af A's øvelser ---
    const exPrivate = await makeExercise(A, "Kun A");
    const exCardio = await makeExercise(A, "A cardio", "cardio");
    const exUsedBySets = await makeExercise(A, "A brugt af Bs sæt");
    const exUsedByProgram = await makeExercise(A, "A brugt af Bs program");
    const exUsedByNote = await makeExercise(A, "A brugt af Bs note");
    const exBuiltinBS = await makeExercise(null, "Indbygget"); // fremmed, ejerløs øvelse, må ikke røres

    const wA1 = await makeWorkout(A), wA2 = await makeWorkout(A, false);
    await addSet(wA1, exPrivate); await addSet(wA1, builtinId); await addSet(wA2, exUsedBySets);
    await q(`INSERT INTO workout_cardio (workout_id, exercise_id, distance_km, duration_sec) VALUES ($1::uuid, $2::uuid, 5, 1800)`, [wA1, exCardio]);
    await q(`INSERT INTO exercise_note (user_id, exercise_id, note) VALUES ($1::uuid, $2::uuid, 'huskenote'), ($1::uuid, $3::uuid, 'huskenote 2')`, [A, exPrivate, builtinId]);
    const [programA] = await q(`INSERT INTO training_program (user_id, name) VALUES ($1::uuid, 'A pushdag') RETURNING id`, [A]);
    await q(`INSERT INTO training_program_exercise (program_id, exercise_id, position) VALUES ($1::uuid, $2::uuid, 0), ($1::uuid, $3::uuid, 1)`, [programA.id, exPrivate, builtinId]);
    const [postA] = await q(`INSERT INTO community_post (user_id, workout_id, summary, caption) VALUES ($1::uuid, $2::uuid, '{}'::jsonb, 'min deling') RETURNING id`, [A, wA1]);
    // A's eget login med rigtig session via Better Auth, plus push knyttet til sessionen.
    const signedIn = await auth.api.signInEmail({ body: { email: emailFor(A), password: passwords.get(A)! } });
    const [sessionA] = await q(`SELECT id FROM session WHERE token = $1`, [signedIn.token]);
    await q(`INSERT INTO session (id, expires_at, token, updated_at, user_id) VALUES ($1::uuid, now() + interval '1 day', $2, now(), $3::uuid)`, [randomUUID(), randomBytes(16).toString("hex"), A]);
    await q(`INSERT INTO push_subscription (user_id, session_id, endpoint, p256dh, auth) VALUES ($1::uuid, $2::uuid, $3, 'p', 'a')`, [A, sessionA.id, `https://push.example.invalid/${tag}`]);
    await q(`INSERT INTO log_submission (id, user_id) VALUES ($1::uuid, $2::uuid)`, [randomUUID(), A]);
    await q(`INSERT INTO verification (identifier, value, expires_at) VALUES ('reset-request', $1, now() + interval '7 days')`, [A]);
    const [invitationA] = await q(`INSERT INTO invitation (email, token_hash, expires_at, used_at) VALUES ($1, $2, now() + interval '7 days', now()) RETURNING id`, [emailFor(A), randomBytes(16).toString("hex")]);
    await q(`INSERT INTO invitation_attempt (invitation_id, attempts, window_ends_at) VALUES ($1::uuid, 1, now())`, [invitationA.id]);

    const wB = await makeWorkout(B);
    await addSet(wB, exUsedBySets); await addSet(wB, exUsedBySets);
    await q(`INSERT INTO exercise_note (user_id, exercise_id, note) VALUES ($1::uuid, $2::uuid, 'Bs note')`, [B, exUsedByNote]);
    const [programB] = await q(`INSERT INTO training_program (user_id, name) VALUES ($1::uuid, 'B program') RETURNING id`, [B]);
    await q(`INSERT INTO training_program_exercise (program_id, exercise_id, position) VALUES ($1::uuid, $2::uuid, 0)`, [programB.id, exUsedByProgram]);
    const [postB] = await q(`INSERT INTO community_post (user_id, workout_id, summary, caption) VALUES ($1::uuid, $2::uuid, '{}'::jsonb, 'Bs deling') RETURNING id`, [B, wB]);
    // Krydsende Community-aktivitet: B på A's opslag, A på B's opslag, og B på eget opslag.
    await q(`INSERT INTO community_comment (post_id, user_id, body) VALUES ($1::uuid, $2::uuid, 'B til A'), ($3::uuid, $4::uuid, 'A til B'), ($3::uuid, $2::uuid, 'B til B')`, [postA.id, B, postB.id, A]);
    await q(`INSERT INTO community_reaction (post_id, user_id) VALUES ($1::uuid, $2::uuid), ($3::uuid, $4::uuid), ($3::uuid, $2::uuid)`, [postA.id, B, postB.id, A]);

    const beforeA = await counts(A, emailFor(A));
    const beforeB = await counts(B, emailFor(B));
    // Alle tabeller i optællingen har rækker for A (ingen tom tabel gemmer sig i "0 tilbage").
    for (const [table, n] of Object.entries(beforeA)) {
      if (table === "rate_limit") continue; // oprettes ved første forsøg nedenfor
      assert.ok(n >= 1, `Opsætningen mangler rækker i ${table}`);
    }
    assert.equal(beforeA.session, 2);
    assert.equal(beforeA.workout, 2);
    assert.equal(beforeA.exercise, 5);

    await t.test("(c) Forkert adgangskode sletter intet", async () => {
      const result = await deleteAccount(A, "forkert-adgangskode");
      assert.deepEqual([result.success, result.success === false && result.code], [false, "wrong_password"]);
      const after = await counts(A, emailFor(A));
      assert.deepEqual({ ...after, rate_limit: 0 }, { ...beforeA, rate_limit: 0 });
      assert.equal(after.rate_limit, 1); // forsøget er talt
      assert.equal((await deleteAccount(A, "")).success, false);
      assert.equal((await deleteAccount(A, undefined)).success, false);
    });

    await t.test("Forsøg begrænses: det sjette afvises, selv med rigtig adgangskode, og intet slettes", async () => {
      for (let i = 0; i < DELETE_ATTEMPT_LIMIT; i++) {
        const result = await deleteAccount(G, "forkert");
        assert.equal(result.success === false && result.code, "wrong_password");
      }
      const blocked = await deleteAccount(G, passwords.get(G)!);
      assert.equal(blocked.success === false && blocked.code, "rate_limited");
      assert.equal((await counts(G, emailFor(G))).user, 1);
    });

    await t.test("(d) Den sidste admin kan ikke slette sig selv (vagten kører i en transaktion, der altid rulles tilbage)", async () => {
      const probe = async (demoteOthers: boolean) => {
        const statements = [
          ...(demoteOthers ? [db.$client.query(`UPDATE "user" SET role = 'member' WHERE role = 'admin' AND id <> $1::uuid`, [D])] : []),
          ...buildDeletionStatements(D).slice(0, 3), // lock_timeout, set_config og vagten
          db.$client.query(`DO $$ BEGIN RAISE EXCEPTION 'ZET_TEST_ROLLBACK'; END $$`),
        ];
        try { await db.$client.transaction(statements); } catch (error) { return (error as Error).message; }
        return "ingen fejl";
      };
      assert.match(await probe(true), /ZET_LAST_ADMIN/);   // D er eneste admin: blokeret
      assert.match(await probe(false), /ZET_TEST_ROLLBACK/); // andre admins findes: vagten lader D passere
      // Intet blev committet: de andre admins er stadig admin.
      assert.equal((await q(`SELECT role FROM "user" WHERE id = $1::uuid`, [E]))[0].role, "admin");
      assert.equal((await counts(D, emailFor(D))).user, 1);
    });

    await t.test("En admin må slette sig, når en anden admin findes", async () => {
      assert.equal((await deleteAccount(D, passwords.get(D)!)).success, true);
      assert.equal((await counts(D, emailFor(D))).user, 0);
    });

    await t.test("(a) (b) (e) Korrekt adgangskode sletter A helt, men bevarer andres data og brugte øvelser", async () => {
      const result = await deleteAccount(A, passwords.get(A)!);
      assert.deepEqual(result, { success: true });

      // (a) og (e): nul rækker i hver tabel, inklusive sessioner.
      const afterA = await counts(A, emailFor(A));
      console.log("Rækker for A før:", JSON.stringify(beforeA));
      console.log("Rækker for A efter:", JSON.stringify(afterA));
      for (const [table, n] of Object.entries(afterA)) assert.equal(n, 0, `${table} har stadig rækker`);
      assert.equal(sum(afterA), 0);
      assert.equal((await q(`SELECT count(*)::int AS n FROM session WHERE token = $1`, [signedIn.token]))[0].n, 0);

      // (b) A's øvelser: brugte beholdes uden ejer, resten er væk.
      for (const kept of [exUsedBySets, exUsedByProgram, exUsedByNote]) {
        const row = await exerciseOwner(kept);
        assert.ok(row, "Øvelse som andre bruger skulle være bevaret");
        assert.equal(row.user_id, null);
      }
      for (const gone of [exPrivate, exCardio]) assert.equal(await exerciseOwner(gone), undefined);
      assert.equal((await q(`SELECT count(*)::int AS n FROM exercise_muscle_group WHERE exercise_id = ANY($1::uuid[])`, [[exPrivate, exCardio]]))[0].n, 0);
      assert.equal((await q(`SELECT count(*)::int AS n FROM exercise_muscle_group WHERE exercise_id = ANY($1::uuid[])`, [[exUsedBySets, exUsedByProgram, exUsedByNote]]))[0].n, 3);
      assert.ok(await exerciseOwner(builtinId));
      assert.ok(await exerciseOwner(exBuiltinBS));
      assert.equal((await q(`SELECT count(*)::int AS n FROM exercise WHERE user_id IS NULL`))[0].n, builtinCountBefore + 1 + 3);

      // (b) B's pas, sæt, program og note er uændrede; kun B's kommentar og reaktion på A's opslag er væk.
      const afterB = await counts(B, emailFor(B));
      assert.equal(afterB.workout_set, 2);
      assert.equal(afterB.community_post, 1);
      assert.deepEqual({ ...afterB }, { ...beforeB, community_comment: beforeB.community_comment - 1, community_reaction: beforeB.community_reaction - 1 });
      // På B's opslag er A's kommentar og reaktion væk, B's egne er der stadig.
      assert.equal((await q(`SELECT count(*)::int AS n FROM community_comment WHERE post_id = $1::uuid`, [postB.id]))[0].n, 1);
      assert.equal((await q(`SELECT count(*)::int AS n FROM community_reaction WHERE post_id = $1::uuid`, [postB.id]))[0].n, 1);
    });

    await t.test("En allerede slettet konto kan ikke slettes igen", async () => {
      const result = await deleteAccount(A, passwords.get(A)!);
      assert.equal(result.success === false && result.code, "not_found");
    });
  } finally {
    // Oprydning: pas før brugere, da sæt refererer til øvelser uden cascade.
    const ids = allUsers;
    const run = (text: string, params: unknown[] = [ids]) => q(text, params).catch(() => []);
    await run(`DELETE FROM community_reaction WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM community_comment WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM community_post WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM push_subscription WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM log_submission WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM exercise_note WHERE user_id = ANY($1::uuid[]) OR exercise_id = ANY($2::uuid[])`, [ids, createdExercises]);
    await run(`DELETE FROM workout WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM training_program WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM exercise WHERE id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])`, [createdExercises, ids]);
    await run(`DELETE FROM verification WHERE value = ANY($1::text[])`, [ids]);
    await run(`DELETE FROM invitation WHERE email LIKE $1`, [`zet-delete-${tag}-%@example.invalid`]);
    await run(`DELETE FROM rate_limit WHERE key = ANY($1::text[])`, [ids.map((id) => `delete-account:${id}`)]);
    await run(`DELETE FROM session WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM account WHERE user_id = ANY($1::uuid[])`);
    await run(`DELETE FROM "user" WHERE id = ANY($1::uuid[])`);
    const [left] = await q(`SELECT
      (SELECT count(*) FROM "user" WHERE id = ANY($1::uuid[]) OR email LIKE $2)::int AS users,
      (SELECT count(*) FROM exercise WHERE id = ANY($3::uuid[]) OR user_id = ANY($1::uuid[]))::int AS exercises,
      (SELECT count(*) FROM workout WHERE user_id = ANY($1::uuid[]))::int AS workouts,
      (SELECT count(*) FROM rate_limit WHERE key LIKE 'delete-account:%' AND key = ANY($4::text[]))::int AS rate_limits`,
      [allUsers, `zet-delete-${tag}-%`, createdExercises, allUsers.map((id) => `delete-account:${id}`)]);
    console.log("Testdata tilbage efter oprydning:", JSON.stringify(left));
    assert.deepEqual(left, { users: 0, exercises: 0, workouts: 0, rate_limits: 0 });
  }
});
