import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { app } from "../server";
test("health, bounded queries, origin protections and rate limits", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(base + "/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("x-content-type-options"), "nosniff");
    assert.equal(health.headers.get("x-powered-by"), null);
    assert.equal((await health.json()).version, 2);
    assert.equal((await fetch(base + "/api/v1/players?page=-1")).status, 400);
    assert.equal((await fetch(base + "/api/v1/players?q[x]=bad")).status, 400);
    assert.equal((await fetch(base + "/api/v1/players/legacy:1")).status, 400);
    assert.equal(
      (
        await fetch(base + "/api/v1/data-status", {
          headers: { origin: "https://elsewhere.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/v1/data-status", {
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status,
      403,
    );
    assert.equal((await fetch(base + "/api/missing")).status, 404);
    for (let i = 0; i < 60; i++) await fetch(base + "/api/v1/data-status");
    assert.equal((await fetch(base + "/api/v1/data-status")).status, 429);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
