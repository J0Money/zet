import assert from "node:assert/strict";
import { mock, test } from "node:test";

test("Oprydningstimeren starter ikke uden RAILWAY_ENVIRONMENT_NAME", async () => {
  const saved = { railway: process.env.RAILWAY_ENVIRONMENT_NAME, runtime: process.env.NEXT_RUNTIME };
  delete process.env.RAILWAY_ENVIRONMENT_NAME;
  process.env.NEXT_RUNTIME = "nodejs";
  const interval = mock.method(globalThis, "setInterval");
  try {
    const { register } = await import("../instrumentation");
    await register();
    assert.equal(interval.mock.callCount(), 0);
  } finally {
    interval.mock.restore();
    if (saved.railway === undefined) delete process.env.RAILWAY_ENVIRONMENT_NAME;
    else process.env.RAILWAY_ENVIRONMENT_NAME = saved.railway;
    if (saved.runtime === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = saved.runtime;
  }
});
