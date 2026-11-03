import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

test("Nulstilling af adgangskode via engangslink", {
  skip: process.env.ZET_RUN_RESET_TESTS !== "1",
}, async (t) => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, account, session, verification } = await import("../lib/db/schema");
  const { auth } = await import("../lib/auth");
  const { createPasswordReset, isPasswordResetTokenValid, resetPasswordWithToken } = await import("../lib/password-reset");
  const id = randomUUID();
  const email = `zet-reset-${id}@example.invalid`;
  const oldPassword = randomBytes(24).toString("hex");
  const newPassword = randomBytes(24).toString("hex");
  const signIn = (password: string) => auth.api.signInEmail({ body: { email, password } }).then(() => true, () => false);
  try {
    await db.insert(user).values({ id, email, name: "Nulstillingstest" });
    await db.insert(account).values({
      id: randomUUID(), userId: id, accountId: id, providerId: "credential",
      password: await hashPassword(oldPassword), updatedAt: new Date(),
    });
    assert.equal(await signIn(oldPassword), true);

    await t.test("Ukendt e-mail giver ingen link", async () => {
      assert.equal((await createPasswordReset(`ukendt-${email}`)).success, false);
    });

    await t.test("Koden gemmes kun som hash, og et nyt link gør det gamle ugyldigt", async () => {
      const first = await createPasswordReset(email.toUpperCase());
      const second = await createPasswordReset(email);
      assert.ok(first.success && second.success);
      const rows = await db.select().from(verification).where(eq(verification.value, id));
      assert.equal(rows.length, 1);
      assert.ok(!rows[0].identifier.includes(second.token));
      assert.equal(await isPasswordResetTokenValid(first.token), false);
      assert.equal(await isPasswordResetTokenValid(second.token), true);
    });

    await t.test("Ny adgangskode virker, gammel virker ikke, sessioner logges ud, link kan kun bruges én gang", async () => {
      const link = await createPasswordReset(email);
      assert.ok(link.success);
      assert.ok((await db.select().from(session).where(eq(session.userId, id))).length > 0);
      assert.equal((await resetPasswordWithToken(link.token, "kort")).success, false);
      assert.equal((await resetPasswordWithToken(link.token, newPassword)).success, true);
      assert.equal((await db.select().from(session).where(eq(session.userId, id))).length, 0);
      assert.equal(await signIn(oldPassword), false);
      assert.equal(await signIn(newPassword), true);
      assert.equal((await resetPasswordWithToken(link.token, oldPassword)).success, false);
      assert.equal(await isPasswordResetTokenValid(link.token), false);
    });

    await t.test("Ugyldige links afvises", async () => {
      assert.equal(await isPasswordResetTokenValid("x".repeat(64)), false);
      assert.equal(await isPasswordResetTokenValid(randomBytes(32).toString("hex")), false);
      assert.equal((await resetPasswordWithToken(randomBytes(32).toString("hex"), newPassword)).success, false);
    });
  } finally {
    await db.delete(verification).where(eq(verification.value, id));
    await db.delete(session).where(eq(session.userId, id));
    await db.delete(account).where(eq(account.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
});
