import test from "node:test";
import assert from "node:assert/strict";
import { createRefreshService } from "../server/refresh-service";
test("refresh deduplicates active jobs, reports progress and atomically publishes valid sources", async () => {
  const files: Record<string, unknown> = {};
  let requests = 0,
    rebuilds = 0;
  const service = createRefreshService({
    codes: ["PL"],
    read: (name) => files[name],
    write: async (name, value) => {
      files[name] = structuredClone(value);
    },
    rebuild: () => {
      rebuilds++;
    },
    request: async (url) => {
      requests++;
      if (url === "fpl")
        return {
          teams: [{ id: 1, name: "Team" }],
          elements: [
            {
              first_name: "Player",
              second_name: "One",
              team: 1,
              minutes: 90,
              goals_scored: 0,
              assists: 0,
              saves: 0,
              clean_sheets: 0,
            },
          ],
        };
      if (url.includes("teams"))
        return {
          competition: { id: 1, name: "PL", type: "LEAGUE" },
          teams: [
            { id: 1, name: "Team", area: { name: "England" }, squad: [] },
          ],
        };
      return { matches: [] };
    },
  });
  const first = service.start().id;
  assert.equal(service.start().id, first);
  await service.finished();
  assert.equal(requests, 3);
  assert.equal(rebuilds, 1);
  assert.equal(service.job.state, "complete");
  assert.equal(service.job.progress, 3);
  assert.ok(files["football-live.json"]);
  assert.ok(files["football-results.json"]);
});
test("quota exhaustion and malformed responses preserve previous valid data and can retry", async () => {
  const previous = { competitions: [{ code: "PL", marker: "saved" }] },
    fpl = { saved: true };
  const files: Record<string, unknown> = {
    "football-live.json": previous,
    "fpl-live.json": fpl,
  };
  let fail = true;
  const service = createRefreshService({
    codes: ["PL"],
    read: (name) => files[name],
    write: async (name, value) => {
      files[name] = value;
    },
    rebuild: () => {},
    request: async (url) => {
      if (fail) throw new Error("Provider returned 429 (quota reached)");
      return url === "fpl"
        ? {
            teams: [{ id: 1, name: "Team" }],
            elements: [
              {
                first_name: "Player",
                second_name: "One",
                team: 1,
                minutes: 90,
                goals_scored: 0,
                assists: 0,
                saves: 0,
                clean_sheets: 0,
              },
            ],
          }
        : { invalid: true };
    },
  });
  service.start();
  await service.finished();
  assert.equal(service.job.state, "failed");
  assert.equal(files["football-live.json"], previous);
  assert.equal(files["fpl-live.json"], fpl);
  assert.ok(service.job.errors.some((e) => e.includes("429")));
  fail = false;
  service.start();
  await service.finished();
  assert.equal(service.job.state, "partial");
  assert.equal(files["football-live.json"], previous);
  assert.notEqual(files["fpl-live.json"], fpl);
});
