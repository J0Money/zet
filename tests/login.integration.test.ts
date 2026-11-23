import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { eq, like } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { parseSetCookieHeader } from "better-auth/cookies";

test("Login med session og fælles forsøgstæller", {
  skip: process.env.ZET_RUN_LOGIN_TESTS !== "1",
}, async (t) => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, account, rateLimit } = await import("../lib/db/schema");
  const { auth } = await import("../lib/auth");
  const { loginWithPassword, accountLoginKey, ACCOUNT_LOGIN_LIMIT, ACCOUNT_LOCKED_MESSAGE } = await import("../lib/login");
  const id = randomUUID();
  const email = `zet-login-${id}@example.invalid`;
  const unknownEmail = `ukendt-spaerret-${id}@example.invalid`;
  const accountKey = accountLoginKey(email);
  const password = randomBytes(24).toString("hex");
  const ip = `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
  // Better Auth grupperer IPv6-adresser efter /64 og udfolder alle grupper.
  const rateKey = `${ip.replace("2001:db8:", "2001:0db8:").replace("::1", ":0000:0000:0000:0000")}|/sign-in/email`;
  const requestHeaders = new Headers({
    origin: process.env.BETTER_AUTH_URL!,
    "x-forwarded-for": ip,
  });
  try {
    await db.insert(user).values({ id, email, name: "Logintest" });
    await db.insert(account).values({
      id: randomUUID(), userId: id, accountId: id, providerId: "credential",
      password: await hashPassword(password), updatedAt: new Date(),
    });
    await t.test("Forkert adgangskode og ukendt bruger giver samme fejl", async () => {
      const wrong = await loginWithPassword(email, "forkert-adgangskode", requestHeaders);
      const unknown = await loginWithPassword(`ukendt-${email}`, password, requestHeaders);
      assert.ok(wrong.error);
      assert.equal(wrong.error, unknown.error);
    });
    await t.test("Login udsteder en beskyttet cookie og en gyldig session", async () => {
      const result = await loginWithPassword(email.toUpperCase(), password, requestHeaders);
      assert.ok(result.response);
      const cookies = parseSetCookieHeader(result.response.headers.get("set-cookie")!);
      assert.ok([...cookies.values()].some((cookie) => cookie.httponly));
      const cookieHeader = [...cookies].map(([name, cookie]) => `${name}=${cookie.value}`).join("; ");
      const current = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
      assert.equal(current?.user.id, id);
    });
    await t.test("Det sjette forsøg afvises, og tælleren ligger i databasen", async () => {
      await loginWithPassword(email, "forkert-adgangskode", requestHeaders);
      await loginWithPassword(email, "forkert-adgangskode", requestHeaders);
      const result = await loginWithPassword(email, password, requestHeaders);
      assert.equal(result.error, "For mange loginforsøg. Vent et minut, og prøv igen.");
      const rows = await db.select().from(rateLimit).where(eq(rateLimit.key, rateKey));
      assert.equal(rows.length, 1);
      assert.ok(rows[0].count >= 5);
    });
    // Ny IP for hvert forsøg, så kun grænsen pr. konto kan slå til.
    const freshHeaders = () => new Headers({
      origin: process.env.BETTER_AUTH_URL!,
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`,
    });
    await t.test("Grænsen pr. konto: korrekt login nulstiller, 10 forkerte spærrer", async () => {
      const { clearRateLimit } = await import("../lib/rate-limit");
      await clearRateLimit(accountKey);
      for (let i = 0; i < 9; i++) await loginWithPassword(email, "forkert-adgangskode", freshHeaders());
      const ok = await loginWithPassword(email, password, freshHeaders());
      assert.ok(ok.response, "korrekt login før grænsen skal virke");
      assert.equal((await db.select().from(rateLimit).where(eq(rateLimit.key, accountKey))).length, 0);
      for (let i = 0; i < ACCOUNT_LOGIN_LIMIT; i++) {
        const wrong = await loginWithPassword(email, "forkert-adgangskode", freshHeaders());
        assert.equal(wrong.error, "E-mailadressen eller adgangskoden er forkert.");
      }
      const locked = await loginWithPassword(email.toUpperCase(), password, freshHeaders());
      assert.equal(locked.error, ACCOUNT_LOCKED_MESSAGE);
      const rows = await db.select().from(rateLimit).where(eq(rateLimit.key, accountKey));
      assert.equal(rows[0]?.count, ACCOUNT_LOGIN_LIMIT);
      assert.ok(!rows[0].key.includes("@"), "nøglen må ikke indeholde e-mailen");
    });
    await t.test("Ukendt e-mail spærres på samme måde", async () => {
      for (let i = 0; i < ACCOUNT_LOGIN_LIMIT; i++) await loginWithPassword(unknownEmail, password, freshHeaders());
      const locked = await loginWithPassword(unknownEmail, password, freshHeaders());
      assert.equal(locked.error, ACCOUNT_LOCKED_MESSAGE);
    });
  } finally {
    await db.delete(user).where(eq(user.id, id));
    await db.delete(rateLimit).where(eq(rateLimit.key, rateKey));
    // 2001:db8::/32 er dokumentationsadresser, som kun testene bruger.
    await db.delete(rateLimit).where(like(rateLimit.key, "2001:0db8:%|/sign-in/email"));
    await db.delete(rateLimit).where(eq(rateLimit.key, accountKey));
    await db.delete(rateLimit).where(eq(rateLimit.key, accountLoginKey(unknownEmail)));
  }
});
