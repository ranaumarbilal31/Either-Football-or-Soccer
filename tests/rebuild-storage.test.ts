import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { openDB } from "idb";
import { loadGame, saveGame } from "../src/game/storage";
import { freshSave, matchLimit } from "../src/game/types";
import { saveSchema } from "../src/game/validation";
import { simulate } from "../src/game/engine";
import { side } from "./rebuild-fixtures";
test("fresh storage starts empty, round trips and prevents cross-tab overwrites", async () => {
  const initial = await loadGame();
  assert.equal(initial.club, null);
  assert.equal(initial.squad.ids.filter(Boolean).length, 0);
  const next = {
    ...freshSave(),
    club: {
      name: "Test FC",
      manager: "Manager",
      difficulty: "Medium",
      budget: 100,
    },
  };
  await saveGame(next);
  assert.deepEqual(await loadGame(), next);
  const db = await openDB("efos-rebuilt");
  const record = await db.get("game", "active");
  await db.put(
    "game",
    { ...record, _revision: record._revision + 1 },
    "active",
  );
  await assert.rejects(() => saveGame(next), /Another tab/);
  await db.put(
    "game",
    { version: 3, broken: true, _revision: record._revision + 1 },
    "active",
  );
  await assert.rejects(() => loadGame(), /archived/);
  assert.ok(
    (await db.getAllKeys("archive")).some((key) =>
      String(key).startsWith("unreadable-"),
    ),
  );
  db.close();
});
test("a full match history saves without the app outrunning the schema limit", () => {
  const played = simulate(
    side("home"),
    side("away"),
    1,
    "2026-10-06T00:00:00Z",
  );
  const club = {
    name: "Test FC",
    manager: "Manager",
    difficulty: "Medium",
    budget: 100,
  };
  const history = Array.from({ length: matchLimit }, (_, i) => ({
    ...played,
    id: `match-${i}`,
  }));
  assert.equal(
    saveSchema.safeParse({ ...freshSave(), club, matches: history }).success,
    true,
  );
  assert.equal(
    saveSchema.safeParse({
      ...freshSave(),
      club,
      matches: [...history, { ...played, id: "one-too-many" }],
    }).success,
    false,
  );
});
