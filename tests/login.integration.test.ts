import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { parseSetCookieHeader } from "better-auth/cookies";

test("Login med session og fælles forsøgstæller", {
  skip: process.env.ZET_RUN_LOGIN_TESTS !== "1",
}, async (t) => {
  config({ path: ".env.local", quiet: true });
  const { db } = await import("../lib/db");
  const { user, account, rateLimit } = await import("../lib/db/schema");
  const { auth } = await import("../lib/auth");
  const { loginWithPassword } = await import("../lib/login");
  const id = randomUUID();
  const email = `zet-login-${id}@example.invalid`;
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
    await t.test("Det sjette forsøg afvises, og tælleren ligger i Neon", async () => {
      await loginWithPassword(email, "forkert-adgangskode", requestHeaders);
      await loginWithPassword(email, "forkert-adgangskode", requestHeaders);
      const result = await loginWithPassword(email, password, requestHeaders);
      assert.equal(result.error, "For mange loginforsøg. Vent et minut, og prøv igen.");
      const rows = await db.select().from(rateLimit).where(eq(rateLimit.key, rateKey));
      assert.equal(rows.length, 1);
      assert.ok(rows[0].count >= 5);
    });
  } finally {
    await db.delete(user).where(eq(user.id, id));
    await db.delete(rateLimit).where(eq(rateLimit.key, rateKey));
  }
});
