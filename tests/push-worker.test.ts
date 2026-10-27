import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

test("Push viser neutral tekst og åbner kun Community på egen origin", async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const shown: { title: string; options: { body: string; data: { path: string } } }[] = [];
  const opened: string[] = [];
  const pending: Promise<unknown>[] = [];
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { URL, self: {
    addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
    location: { origin: "https://zet.example" },
    registration: { showNotification: async (title: string, options: typeof shown[number]["options"]) => { shown.push({ title, options }); } },
    clients: { openWindow: async (url: string) => { opened.push(url); } },
  } });
  const waitUntil = (promise: Promise<unknown>) => pending.push(promise);
  handlers.get("push")!({ data: { json: () => ({ body: "Privat tekst", url: "https://evil.test" }) }, waitUntil });
  assert.equal(shown[0].options.data.path, "/community");
  assert.equal(shown[0].options.body.includes("Privat tekst"), false);
  handlers.get("notificationclick")!({ notification: { close() {}, data: { path: "//evil.test" } }, waitUntil });
  const postPath = "/community/12345678-1234-1234-1234-123456789abc";
  handlers.get("notificationclick")!({ notification: { close() {}, data: { path: postPath } }, waitUntil });
  await Promise.all(pending);
  assert.deepEqual(opened, ["https://zet.example/community", `https://zet.example${postPath}`]);
  assert.equal(handlers.has("fetch"), false);
});
