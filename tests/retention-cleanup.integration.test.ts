import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq, inArray, like } from "drizzle-orm";

// Opretter midlertidige rækker (brugere under example.invalid, tilfældige
// nøgler), kører oprydningen og tæller. Kører mod den rigtige database, så
// tællingerne i resultatet kan også indeholde rigtige udløbne rækker; testen
// kontrollerer derfor testens egne rækker og at anden kørsel sletter 0.
test("Oprydning sletter kun udløbne rækker og kan køres igen", { skip: process.env.ZET_RUN_CLEANUP_TESTS !== "1" }, async () => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, account, session, verification, invitation, invitationAttempt, rateLimit, logSubmission, workout } = await import("../lib/db/schema");
  const cleanup = await import("../lib/retention-cleanup");

  const now = Date.now();
  const minutes = (m: number) => new Date(now + m * 60000);
  const days = (d: number) => new Date(now + d * 86400000);
  const owner = randomUUID();
  const tag = randomUUID();
  const sessionIds = { expired: randomUUID(), live: randomUUID() };
  const verificationIds = { expired: randomUUID(), live: randomUUID(), expiredRequest: randomUUID() };
  const inviteIds = { expired31: randomUUID(), expired1: randomUUID(), used31: randomUUID(), revoked31: randomUUID(), pending: randomUUID(), usedRecent: randomUUID() };
  const rateKeys = { old: `test-${tag}-old`, fresh: `test-${tag}-fresh` };
  const submissions = { old: randomUUID(), recent: randomUUID() };
  const workoutId = randomUUID();
  const accountId = randomUUID();

  const count = async <T extends { id: unknown }>(table: T, ids: string[]): Promise<number> => {
    const t = table as never as typeof session;
    const rows = await db.select({ id: t.id }).from(t).where(inArray(t.id, ids));
    return rows.length;
  };

  try {
    await db.insert(user).values({ id: owner, name: "Cleanup test", email: `${owner}@example.invalid` });
    await db.insert(account).values({ id: accountId, accountId: owner, providerId: "credential", userId: owner, password: "x" });
    await db.insert(workout).values({ id: workoutId, user_id: owner, date: "2026-10-29" });

    await db.insert(session).values([
      { id: sessionIds.expired, token: `t-${tag}-a`, userId: owner, expiresAt: minutes(-1) },
      { id: sessionIds.live, token: `t-${tag}-b`, userId: owner, expiresAt: minutes(60) },
    ]);
    await db.insert(verification).values([
      { id: verificationIds.expired, identifier: `test-${tag}`, value: "x", expiresAt: minutes(-1) },
      { id: verificationIds.expiredRequest, identifier: "reset-request", value: owner, expiresAt: minutes(-1) },
      { id: verificationIds.live, identifier: `test-${tag}`, value: "x", expiresAt: minutes(60) },
    ]);
    const inv = (id: string, extra: Partial<typeof invitation.$inferInsert>) => ({
      id, email: `${id}@example.invalid`, tokenHash: `hash-${id}`, expiresAt: days(7), ...extra,
    });
    await db.insert(invitation).values([
      inv(inviteIds.expired31, { expiresAt: days(-31) }),
      inv(inviteIds.expired1, { expiresAt: days(-1) }),
      inv(inviteIds.used31, { usedAt: days(-31) }),
      inv(inviteIds.revoked31, { revokedAt: days(-31) }),
      inv(inviteIds.pending, {}),
      inv(inviteIds.usedRecent, { usedAt: days(-1) }),
    ]);
    await db.insert(invitationAttempt).values([
      { invitationId: inviteIds.expired31, attempts: 1, windowEndsAt: days(-31) },
      { invitationId: inviteIds.pending, attempts: 1, windowEndsAt: days(1) },
    ]);
    await db.insert(rateLimit).values([
      { key: rateKeys.old, count: 1, lastRequest: now - 2 * 86400000 },
      { key: rateKeys.fresh, count: 1, lastRequest: now },
    ]);
    await db.insert(logSubmission).values([
      { id: submissions.old, user_id: owner, created_at: days(-4) },
      { id: submissions.recent, user_id: owner, created_at: days(-1) },
    ]);

    const first = await cleanup.runRetentionCleanup();
    assert.ok(first.sessions >= 1 && first.verifications >= 2 && first.invitations >= 3 && first.rateLimits >= 1 && first.logSubmissions >= 1, JSON.stringify(first));

    // Udløbne rækker er slettet, levende og nyere er urørte.
    assert.equal(await count(session, [sessionIds.expired]), 0);
    assert.equal(await count(session, [sessionIds.live]), 1);
    assert.equal(await count(verification, [verificationIds.expired, verificationIds.expiredRequest]), 0);
    assert.equal(await count(verification, [verificationIds.live]), 1);
    assert.equal(await count(invitation, [inviteIds.expired31, inviteIds.used31, inviteIds.revoked31]), 0);
    assert.equal(await count(invitation, [inviteIds.expired1, inviteIds.pending, inviteIds.usedRecent]), 3);
    // invitation_attempt følger med via cascade.
    const attempts = await db.select().from(invitationAttempt).where(inArray(invitationAttempt.invitationId, [inviteIds.expired31, inviteIds.pending]));
    assert.deepEqual(attempts.map((a) => a.invitationId), [inviteIds.pending]);
    const rate = await db.select().from(rateLimit).where(like(rateLimit.key, `test-${tag}-%`));
    assert.deepEqual(rate.map((r) => r.key), [rateKeys.fresh]);
    assert.equal(await count(logSubmission as never, [submissions.old]), 0);
    assert.equal(await count(logSubmission as never, [submissions.recent]), 1);

    // Brugere, konti og træningsdata er urørte.
    assert.equal((await db.select().from(user).where(eq(user.id, owner))).length, 1);
    assert.equal((await db.select().from(account).where(eq(account.id, accountId))).length, 1);
    assert.equal((await db.select().from(workout).where(eq(workout.id, workoutId))).length, 1);

    // Anden kørsel finder intet mere at slette.
    const second = await cleanup.runRetentionCleanup();
    assert.deepEqual(second, { sessions: 0, verifications: 0, invitations: 0, rateLimits: 0, logSubmissions: 0 });
    assert.equal(await count(session, [sessionIds.live]), 1);
    assert.equal(await count(invitation, [inviteIds.pending]), 1);
  } finally {
    await db.delete(rateLimit).where(like(rateLimit.key, `test-${tag}-%`));
    await db.delete(verification).where(like(verification.identifier, `test-${tag}`));
    await db.delete(verification).where(eq(verification.value, owner));
    await db.delete(invitation).where(inArray(invitation.id, Object.values(inviteIds)));
    await db.delete(workout).where(eq(workout.user_id, owner));
    await db.delete(user).where(eq(user.id, owner));
    // Bekræft at alt er ryddet op.
    const left = {
      users: (await db.select().from(user).where(eq(user.id, owner))).length,
      sessions: (await db.select().from(session).where(eq(session.userId, owner))).length,
      accounts: (await db.select().from(account).where(eq(account.userId, owner))).length,
      workouts: (await db.select().from(workout).where(eq(workout.user_id, owner))).length,
      logSubmissions: (await db.select().from(logSubmission).where(eq(logSubmission.user_id, owner))).length,
      invitations: (await db.select().from(invitation).where(inArray(invitation.id, Object.values(inviteIds)))).length,
      rateLimits: (await db.select().from(rateLimit).where(like(rateLimit.key, `test-${tag}-%`))).length,
      verifications: (await db.select().from(verification).where(eq(verification.value, owner))).length,
    };
    console.log("Testrækker tilbage efter oprydning:", JSON.stringify(left));
    assert.ok(Object.values(left).every((n) => n === 0));
  }
});
