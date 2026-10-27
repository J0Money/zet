import assert from "node:assert/strict";
import { test } from "node:test";
import { communityText, isCommunityId, validPushSubscription } from "../lib/community-input";

test("Kommentarer kræver indhold; opslagstekst er valgfri og længden begrænses", () => {
  assert.deepEqual(communityText("  Hurtig træning med Erik!  ", true), { text: "Hurtig træning med Erik!" });
  assert.ok(communityText(" \n ", true).error);
  assert.deepEqual(communityText(" \n "), { text: "" });
  assert.ok(communityText("a".repeat(1001)).error);
  assert.equal(communityText("a".repeat(1000)).text?.length, 1000);
  assert.equal(isCommunityId("../../../settings"), false);
});

test("Push accepterer kun kendte HTTPS-pushtjenester og gyldige nøgleformater", () => {
  const subscription = (endpoint: string) => ({ endpoint, keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } });
  for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-by3p.notify.windows.com"]) {
    assert.equal(validPushSubscription(subscription(`https://${host}/subscription`)), true);
  }
  for (const url of ["http://fcm.googleapis.com/a", "https://localhost/a", "https://127.0.0.1/a",
    "https://fcm.googleapis.com.evil.test/a", "https://evilpush.apple.com/a", "https://user:pass@fcm.googleapis.com/a",
    "https://fcm.googleapis.com:444/a", "file:///secret"]) assert.equal(validPushSubscription(subscription(url)), false);
  assert.equal(validPushSubscription({ ...subscription("https://fcm.googleapis.com/a"), keys: { auth: "short" } }), false);
});
