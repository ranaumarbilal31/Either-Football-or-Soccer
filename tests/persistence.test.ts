import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { freshSave } from "../src/domain/model";
import {
  loadSave,
  migrateLegacy,
  parseImport,
  persistSave,
} from "../src/state/persistence";
test("IndexedDB saves persist and detect competing tab revisions", async () => {
  const save = freshSave();
  await persistSave(save, 0);
  assert.deepEqual(await loadSave(), save);
  const next = { ...save, revision: 1 };
  await persistSave(next, 0);
  await assert.rejects(persistSave({ ...save, revision: 2 }, 0), /Another tab/);
  assert.equal((await loadSave())!.revision, 1);
});
test("legacy saves recover without changing original storage or inventing identities", () => {
  const data: Record<string, string> = {
    drafted_players: JSON.stringify([
      {
        id: "old1",
        name: "Legacy Keeper",
        position: "GK",
        price: 40,
        club: "Old club",
      },
    ]),
    squad_tactics: JSON.stringify({
      formation: "4-4-2",
      tempo: 0,
      pressingIntensity: 0,
      defensiveLine: 0,
    }),
    budget_limit: "1000",
  };
  const copy = JSON.stringify(data);
  const save = migrateLegacy({ getItem: (key) => data[key] || null });
  assert.equal(save.players[0].id, "legacy:old1");
  assert.equal(save.squads[0].members[0].paid, 40);
  assert.equal(save.squads[0].tactics.tempo, 0);
  assert.equal(JSON.stringify(data), copy);
  assert.equal(
    migrateLegacy({ getItem: () => "{bad" }).squads[0].members.length,
    0,
  );
});
test("imports validate schema, size and active club references", () => {
  assert.throws(() => parseImport("{bad"));
  assert.throws(() => parseImport("x".repeat(8_000_001)), /8 MB/);
  assert.throws(() =>
    parseImport(JSON.stringify({ ...freshSave(), activeId: "absent" })),
  );
});
