import assert from "node:assert/strict";
import crypto, { createHash, randomBytes, randomUUID } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import { test } from "node:test";
import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";

// Testen skriver midlertidige data i den valgte database. Den skal tilvælges
// eksplicit og kører aldrig seed eller migrationer. Alle egne rækker ryddes op.
test(
  "Invitationsforløbet mod Neon",
  { skip: process.env.ZET_RUN_INVITATION_TESTS !== "1" },
  async (t) => {
    config({ path: ".env.local", quiet: true });
    const { db } = await import("../lib/db");
    const { account, invitation, invitationAttempt, session, user } = await import("../lib/db/schema");
    const { auth } = await import("../lib/auth");
    const { acceptInvitation, getInvitationDetails } = await import("../lib/invitations");
    const { registerWithInvitation } = await import("../app/signup/actions");
    const invitationIds: string[] = [];
    const emails: string[] = [];
    const password = randomBytes(24).toString("hex");

    // "I dag minus N år" giver en deterministisk alder, uanset hvornår testen
    // køres, da måned/dag er identisk med i dag (ingen -1-justering i calculateAge).
    function birthDateYearsAgo(years: number): string {
      const now = new Date();
      const year = now.getUTCFullYear() - years;
      const month = String(now.getUTCMonth() + 1).padStart(2, "0");
      const day = String(now.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    const adultBirthDate = birthDateYearsAgo(30);
    const minorBirthDate = birthDateYearsAgo(15);
    const tooYoungBirthDate = birthDateYearsAgo(10);
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    const freshEmail = () => {
      const email = `zet-invitation-test-${randomUUID()}@example.invalid`;
      emails.push(email);
      return email;
    };

    async function createInvitation(
      overrides: Partial<typeof invitation.$inferInsert> = {},
    ) {
      const token = randomBytes(32).toString("hex");
      const id = randomUUID();
      invitationIds.push(id);
      const values = {
        id,
        email: freshEmail(),
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...overrides,
      };
      await db.insert(invitation).values(values);
      return { ...values, token };
    }

    async function readInvitation(id: string) {
      const [row] = await db.select().from(invitation).where(eq(invitation.id, id));
      assert.ok(row);
      return row;
    }

    async function runCase(name: string, work: () => Promise<void>) {
      await t.test(name, async () => {
        try {
          await work();
        } catch {
          // Databasedriverens fejl kan indeholde følsomme SQL-parametre.
          throw new Error(`Testen "${name}" fejlede. Fejldetaljer er skjult.`);
        }
      });
    }

    try {
      await runCase("Ugyldigt input og ukendte links afvises", async () => {
        const fixture = await createInvitation();
        for (const input of [
          null,
          {},
          { token: "../ugyldig", name: "Test", password },
          { token: fixture.token, name: " ", password },
          { token: fixture.token, name: "x".repeat(101), password },
          { token: fixture.token, name: "Test", password: "kort" },
          { token: fixture.token, name: "Test", password: "x".repeat(129) },
        ]) {
          const result = await acceptInvitation(input);
          assert.equal(result.success, false);
        }
        const unknown = await acceptInvitation({
          token: randomBytes(32).toString("hex"), name: "Test", password, birthDate: adultBirthDate,
        });
        assert.ok(!unknown.success && unknown.code === "INVALID_INVITATION");
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
      });

      await runCase("Udløbne, tilbagekaldte og brugte links afvises", async () => {
        for (const overrides of [
          { expiresAt: new Date(Date.now() - 60_000) },
          { revokedAt: new Date() },
          { usedAt: new Date() },
        ]) {
          const fixture = await createInvitation(overrides);
          const result = await acceptInvitation({
            token: fixture.token, name: "Test", password, birthDate: adultBirthDate,
          });
          assert.ok(!result.success && result.code === "INVALID_INVITATION");
          const rows = await db.select().from(user).where(eq(user.email, fixture.email));
          assert.equal(rows.length, 0);
        }
      });

      await runCase("Oprettelse, UUID'er, e-mailbinding, login og genbrug", async () => {
        const normalizedEmail = freshEmail();
        const fixture = await createInvitation({
          email: `  ${normalizedEmail.toUpperCase()}  `,
        });
        const result = await acceptInvitation({
          token: fixture.token,
          name: "  Testbruger  ",
          password,
          birthDate: adultBirthDate,
          email: "maa-ikke-bruges@example.invalid",
        });
        assert.ok(result.success);
        assert.equal(result.email, normalizedEmail);
        assert.match(result.userId, uuidPattern);
        const [created] = await db.select().from(user).where(eq(user.id, result.userId));
        assert.equal(created.name, "Testbruger");
        assert.equal(created.emailVerified, false);
        assert.equal(created.birthDate, adultBirthDate);
        assert.equal(created.adultPermissionConfirmed, null);
        assert.ok(created.ageConfirmationAt);
        const accounts = await db.select().from(account).where(eq(account.userId, created.id));
        assert.equal(accounts.length, 1);
        assert.match(accounts[0].id, uuidPattern);
        assert.equal(accounts[0].accountId, created.id);
        assert.equal(accounts[0].providerId, "credential");
        assert.ok(accounts[0].password && accounts[0].password !== password);
        assert.ok((await readInvitation(fixture.id)).usedAt);
        const beforeLogin = await db.select().from(session).where(eq(session.userId, created.id));
        assert.equal(beforeLogin.length, 0);

        const signedIn = await auth.api.signInEmail({
          body: { email: normalizedEmail, password },
        });
        assert.equal(signedIn.user.id, created.id);
        const sessions = await db.select().from(session).where(
          and(eq(session.userId, created.id), eq(session.token, signedIn.token)),
        );
        assert.equal(sessions.length, 1);
        assert.match(sessions[0].id, uuidPattern);
        await assert.rejects(() => auth.api.signInEmail({
          body: { email: normalizedEmail, password: randomBytes(24).toString("hex") },
        }));
        const reused = await acceptInvitation({
          token: fixture.token, name: "Andet forsøg", password, birthDate: adultBirthDate,
        });
        assert.ok(!reused.success && reused.code === "INVALID_INVITATION");
      });

      await runCase("Under 13 år kan ikke oprette en konto", async () => {
        const fixture = await createInvitation();
        const result = await acceptInvitation({
          token: fixture.token, name: "For ung", password, birthDate: tooYoungBirthDate,
        });
        assert.ok(!result.success && result.code === "INVALID_INPUT");
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
        const rows = await db.select().from(user).where(eq(user.email, fixture.email));
        assert.equal(rows.length, 0);
      });

      await runCase("13-17 år kræver bekræftet voksentilladelse", async () => {
        const fixture = await createInvitation();
        const withoutPermission = await acceptInvitation({
          token: fixture.token, name: "Mindreårig", password, birthDate: minorBirthDate,
        });
        assert.ok(!withoutPermission.success && withoutPermission.code === "INVALID_INPUT");
        const rows = await db.select().from(user).where(eq(user.email, fixture.email));
        assert.equal(rows.length, 0);

        const withPermission = await acceptInvitation({
          token: fixture.token, name: "Mindreårig", password,
          birthDate: minorBirthDate, adultPermissionConfirmed: "on",
        });
        assert.ok(withPermission.success);
        const [created] = await db.select().from(user).where(eq(user.email, fixture.email));
        assert.equal(created.birthDate, minorBirthDate);
        assert.equal(created.adultPermissionConfirmed, true);
        assert.ok(created.ageConfirmationAt);
      });

      await runCase("Tre samtidige forsøg kan kun oprette én konto", async () => {
        const fixture = await createInvitation();
        const results = await Promise.all(
          [1, 2, 3].map(() => acceptInvitation({
            token: fixture.token, name: "Samtidig test", password, birthDate: adultBirthDate,
          })),
        );
        assert.equal(results.filter((result) => result.success).length, 1);
        assert.equal(results.filter((result) =>
          !result.success && result.code === "INVALID_INVITATION",
        ).length, 2);
        const users = await db.select().from(user).where(eq(user.email, fixture.email));
        assert.equal(users.length, 1);
        const accounts = await db.select().from(account).where(eq(account.userId, users[0].id));
        assert.equal(accounts.length, 1);
      });

      await runCase("Eksisterende e-mail ruller invitationens forbrug tilbage", async () => {
        const email = freshEmail();
        const existingId = randomUUID();
        await db.insert(user).values({ id: existingId, email, name: "Eksisterende test" });
        const fixture = await createInvitation({ email });
        const result = await acceptInvitation({
          token: fixture.token, name: "Skal ikke gemmes", password, birthDate: adultBirthDate,
        });
        assert.ok(!result.success && result.code === "EMAIL_IN_USE");
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
        const [existing] = await db.select().from(user).where(eq(user.id, existingId));
        assert.equal(existing.name, "Eksisterende test");
        const accounts = await db.select().from(account).where(eq(account.userId, existingId));
        assert.equal(accounts.length, 0);
      });

      await runCase("Fejl ved kontoindsættelse ruller også den nye bruger tilbage", async () => {
        const ownerId = randomUUID();
        const occupiedAccountId = randomUUID();
        await db.insert(user).values({
          id: ownerId, email: freshEmail(), name: "Test af tilbagerulning",
        });
        await db.insert(account).values({
          id: occupiedAccountId, userId: ownerId,
          accountId: ownerId, providerId: "credential",
        });
        const fixture = await createInvitation();

        // Fremprovokér en rigtig primærnøglefejl i kontoindsættelsen.
        // Bruger-id'et er ledigt; konto-id'et er optaget af vores egen test.
        const originalRandomUUID = crypto.randomUUID;
        let result;
        try {
          crypto.randomUUID = () => occupiedAccountId as ReturnType<typeof randomUUID>;
          syncBuiltinESMExports();
          result = await acceptInvitation({
            token: fixture.token, name: "Skal rulles tilbage", password, birthDate: adultBirthDate,
          });
        } finally {
          crypto.randomUUID = originalRandomUUID;
          syncBuiltinESMExports();
        }
        assert.ok(!result.success && result.code === "UNAVAILABLE");
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
        const users = await db.select().from(user).where(eq(user.email, fixture.email));
        assert.equal(users.length, 0);
        const [existingAccount] = await db.select().from(account).where(eq(account.id, occupiedAccountId));
        assert.equal(existingAccount.userId, ownerId);

        // Efter en tilbagerullet fejl kan samme link bruges igen.
        const retry = await acceptInvitation({
          token: fixture.token, name: "Nyt forsøg", password, birthDate: adultBirthDate,
        });
        assert.ok(retry.success);
      });

      await runCase("To invitationer til samme e-mail giver kun én bruger", async () => {
        const email = freshEmail();
        const fixtures = await Promise.all([
          createInvitation({ email }), createInvitation({ email }),
        ]);
        const results = await Promise.all(fixtures.map((fixture) =>
          acceptInvitation({ token: fixture.token, name: "Test", password, birthDate: adultBirthDate }),
        ));
        assert.equal(results.filter((result) => result.success).length, 1);
        assert.equal(results.filter((result) =>
          !result.success && result.code === "EMAIL_IN_USE",
        ).length, 1);
        const invitations = await db.select().from(invitation).where(
          inArray(invitation.id, fixtures.map((fixture) => fixture.id)),
        );
        assert.equal(invitations.filter((row) => row.usedAt !== null).length, 1);
      });

      await runCase("Better Auths offentlige tilmelding er stadig lukket", async () => {
        const email = freshEmail();
        await assert.rejects(() => auth.api.signUpEmail({
          body: { email, name: "Må ikke oprettes", password },
        }));
        const rows = await db.select().from(user).where(eq(user.email, email));
        assert.equal(rows.length, 0);
      });

      await runCase("Sideopslag forbruger ikke invitationen", async () => {
        const fixture = await createInvitation();
        const details = await getInvitationDetails(fixture.token);
        assert.ok(details.status === "valid" && details.email === fixture.email);
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
        const attempts = await db.select().from(invitationAttempt).where(
          eq(invitationAttempt.invitationId, fixture.id),
        );
        assert.equal(attempts.length, 0);
        assert.equal((await getInvitationDetails(undefined)).status, "invalid");
        assert.equal((await getInvitationDetails([fixture.token])).status, "invalid");
        await db.update(invitation).set({ revokedAt: new Date() }).where(eq(invitation.id, fixture.id));
        assert.equal((await getInvitationDetails(fixture.token)).status, "invalid");
      });

      await runCase("Fælles tæller tillader kun fem samtidige forsøg og nulstilles efter udløb", async () => {
        const email = freshEmail();
        await db.insert(user).values({ email, name: "Test af begrænsning" });
        const fixture = await createInvitation({ email });
        const results = await Promise.all(Array.from({ length: 8 }, () =>
          acceptInvitation({ token: fixture.token, name: "Test", password, birthDate: adultBirthDate }),
        ));
        assert.equal(results.filter((result) =>
          !result.success && result.code === "EMAIL_IN_USE",
        ).length, 5);
        assert.equal(results.filter((result) =>
          !result.success && result.code === "RATE_LIMITED",
        ).length, 3);
        const [counter] = await db.select().from(invitationAttempt).where(
          eq(invitationAttempt.invitationId, fixture.id),
        );
        assert.equal(counter.attempts, 5);
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
        await db.update(invitationAttempt)
          .set({ windowEndsAt: new Date(Date.now() - 60_000) })
          .where(eq(invitationAttempt.invitationId, fixture.id));
        const retry = await acceptInvitation({ token: fixture.token, name: "Test", password, birthDate: adultBirthDate });
        assert.ok(!retry.success && retry.code === "EMAIL_IN_USE");
        const [resetCounter] = await db.select().from(invitationAttempt).where(
          eq(invitationAttempt.invitationId, fixture.id),
        );
        assert.equal(resetCounter.attempts, 1);
      });

      await runCase("Formularhandlingen kontrollerer adgangskoder og ignorerer klientens state", async () => {
        const fixture = await createInvitation();
        const form = new FormData();
        form.set("token", fixture.token);
        form.set("name", "Formulartest");
        form.set("password", password);
        form.set("confirmPassword", "En anden adgangskode");
        form.set("birthDate", adultBirthDate);
        const mismatch = await registerWithInvitation({ success: true }, form);
        assert.equal(mismatch.success, undefined);
        assert.equal(mismatch.error, "Adgangskoderne er ikke ens.");
        assert.equal((await readInvitation(fixture.id)).usedAt, null);
        form.set("confirmPassword", password);
        const result = await registerWithInvitation({}, form);
        assert.deepEqual(result, { success: true });
        const reused = await registerWithInvitation({ success: true }, form);
        assert.ok(reused.error);
        assert.equal(reused.success, undefined);
        assert.equal((await getInvitationDetails(fixture.token)).status, "invalid");
      });
    } finally {
      // Kun adresser og id'er genereret af denne test må slettes.
      // Fremmednøglerne sletter testbrugernes konti og sessioner.
      try {
        const testUsers = emails.length
          ? await db.select({ id: user.id }).from(user).where(inArray(user.email, emails))
          : [];
        if (emails.length) await db.delete(user).where(inArray(user.email, emails));
        if (invitationIds.length) {
          await db.delete(invitation).where(inArray(invitation.id, invitationIds));
          assert.equal((await db.select({ id: invitation.id }).from(invitation)
            .where(inArray(invitation.id, invitationIds))).length, 0);
          assert.equal((await db.select().from(invitationAttempt)
            .where(inArray(invitationAttempt.invitationId, invitationIds))).length, 0);
        }
        if (testUsers.length) {
          const ids = testUsers.map((row) => row.id);
          assert.equal((await db.select({ id: account.id }).from(account)
            .where(inArray(account.userId, ids))).length, 0);
          assert.equal((await db.select({ id: session.id }).from(session)
            .where(inArray(session.userId, ids))).length, 0);
        }
      } catch {
        throw new Error("Oprydning af invitationstesten fejlede. Testdata skal kontrolleres.");
      }
    }
  },
);
