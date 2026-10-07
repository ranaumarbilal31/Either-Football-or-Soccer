import test from "node:test";
import assert from "node:assert/strict";
import { side, fixtureCatalog } from "./rebuild-fixtures";
import { createMatchSession, simulate } from "../src/game/engine";
import { mergeCsv, csvPlayers, parseCsv } from "../server/player-db";
test("CSV import joins full and light files without duplicate players and preserves missing nationality", () => {
  const csv =
    'Player,Nation,Pos,Squad,Comp,Born,Min,Gls,Ast,TklW,Int,Crs\n"One, Player",eng ENG,"MF,FW",Club,eng Premier League,2000,450,2,3,1,2,4\nMissing Country,,GK,Club,eng Premier League,1999,90,,,,,\n';
  const rows = mergeCsv(csv, csv);
  assert.equal(rows.length, 2);
  assert.equal(parseCsv(csv)[0].Player, "One, Player");
  const players = csvPlayers(rows, fixtureCatalog(), "2026-10-06");
  assert.equal(players[0].role, "MID");
  assert.deepEqual(players[0].secondary, ["FWD"]);
  assert.equal(players[1].nationality, null);
  assert.equal(players[1].metrics.prevention, undefined);
});
test("interactive match preserves its recorded past and matches instant simulation without instructions", () => {
  const h = side("home"),
    a = side("away"),
    date = "2026-10-06T00:00:00Z";
  const session = createMatchSession(h, a, 15, date);
  while (session.minute < 45) session.step();
  const past = session.events;
  session.updateTactics(0, { tempo: 90, press: 90, line: 90 });
  while (session.minute < 90) session.step();
  assert.deepEqual(session.events.slice(0, past.length), past);
  assert.equal(h.squad.tactics.tempo, 50);
  const unchanged = createMatchSession(h, a, 15, date);
  while (unchanged.minute < 90) unchanged.step();
  assert.deepEqual(unchanged.finish(), simulate(h, a, 15, date));
  assert.notDeepEqual(session.events.slice(past.length),unchanged.events.slice(past.length));
  assert.throws(() => session.updateTactics(0, h.squad.tactics), /finished/);
});
