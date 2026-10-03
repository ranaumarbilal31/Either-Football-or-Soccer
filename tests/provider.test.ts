import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSports, ProviderCache, roleFrom } from "../server/players";
test("provider identities survive mapping; staff, unknown positions and unsafe images are handled", () => {
  const raw = {
    idPlayer: "123",
    strPlayer: "Test Name",
    strSport: "Soccer",
    strPosition: "Centre-Back",
    strTeam: "",
    strNationality: null,
    strThumb: "https://untrusted.example/image.png",
  };
  const p = normalizeSports(raw, new Date().toISOString())!;
  assert.equal(p.id, "sportsdb:123");
  assert.equal(p.club, null);
  assert.equal(p.image, null);
  assert.equal(p.role, "DEF");
  assert.equal(roleFrom("unknown"), null);
  assert.equal(
    normalizeSports(
      { ...raw, strPosition: "Assistant Coach" },
      new Date().toISOString(),
    ),
    null,
  );
});
test("cache deduplicates requests and serves dated stale data on upstream failure", async () => {
  let count = 0;
  let now = 100_000;
  let fail = false;
  const cache = new ProviderCache(
    (async () => {
      count++;
      if (fail) throw new Error("offline");
      return new Response(JSON.stringify({ player: [] }));
    }) as typeof fetch,
    () => now,
  );
  await Promise.all([
    cache.get("x", "https://example.test"),
    cache.get("x", "https://example.test"),
  ]);
  assert.equal(count, 1);
  now += 86_400_001;
  fail = true;
  const stale = await cache.get("x", "https://example.test");
  assert.equal(stale.stale, true);
  now += 7 * 86_400_000;
  await assert.rejects(cache.get("x", "https://example.test"));
});
test("quota exhaustion and malformed responses do not become successful empty lists", async () => {
  let now = 100_000;
  const cache = new ProviderCache(
    (async () => new Response(JSON.stringify({ player: [] }))) as typeof fetch,
    () => now,
  );
  await cache.get("a", "https://example.test", {}, 1);
  await assert.rejects(
    cache.get("b", "https://example.test", {}, 1),
    /allowance/,
  );
  now += 60_001;
  await cache.get("b", "https://example.test", {}, 1);
  const bad = new ProviderCache(
    (async () =>
      new Response(JSON.stringify({ player: "not-an-array" }))) as typeof fetch,
  );
  await assert.rejects(bad.get("x", "https://example.test"), /unsupported/);
});
