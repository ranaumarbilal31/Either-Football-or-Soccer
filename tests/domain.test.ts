import test from "node:test";
import assert from "node:assert/strict";
import {
  blankSquad,
  Formations,
  Formation,
  freshSave,
  slots,
  gameAttributes,
} from "../src/domain/model";
import {
  assign,
  autofill,
  changeFormation,
  spent,
  squadError,
  validateSave,
} from "../src/domain/squad";
import { simulate } from "../src/domain/engine";
import { chartSummary } from "../src/components/ValueChart";
import { fixturePlayers } from "./fixtures";

for (const formation of Object.keys(Formations) as Formation[])
  test(`${formation}: budget, roles, unique slots and deterministic simulation`, () => {
    const squad = autofill(
      { ...blankSquad("test"), formation },
      fixturePlayers,
    );
    assert.equal(squadError(squad, fixturePlayers, true), null);
    assert.equal(squad.members.length, 11);
    assert.ok(spent(squad) <= squad.budget);
    for (const m of squad.members)
      assert.equal(
        fixturePlayers.find((p) => p.id === m.playerId)!.role,
        slots(formation)[Number(m.slot.slice(5))],
      );
    const match = simulate(
      squad,
      fixturePlayers,
      "balanced",
      42,
      "2026-10-03T00:00:00.000Z",
    );
    assert.deepEqual(
      match,
      simulate(
        squad,
        fixturePlayers,
        "balanced",
        42,
        "2026-10-03T00:00:00.000Z",
      ),
    );
    assert.equal(
      match.home.goals,
      match.events.filter((e) => e.side === "home" && e.type === "goal").length,
    );
    for (const side of ["home", "away"] as const) {
      const stats = match[side];
      assert.ok(stats.goals <= stats.onTarget && stats.onTarget <= stats.shots);
      assert.ok(stats.completed <= stats.passes);
      assert.equal(
        stats.xg,
        Number(
          match.events
            .filter((e) => e.side === side)
            .reduce((sum, e) => sum + e.xg, 0)
            .toFixed(2),
        ),
      );
    }
    assert.equal(match.home.possession + match.away.possession, 100);
    assert.equal(
      match.ratings.reduce((s, r) => s + r.passes, 0),
      match.home.passes,
    );
    assert.equal(
      match.ratings.reduce((s, r) => s + r.completed, 0),
      match.home.completed,
    );
    assert.equal(match.events[0].type, "kickoff");
    assert.equal(match.events.at(-1)!.type, "full");
    assert.equal(
      squadError(
        changeFormation(squad, "3-5-2", fixturePlayers),
        fixturePlayers,
        true,
      ),
      null,
    );
  });
test("assignment protects goalkeeper roles, budget and acquisition cost", () => {
  const squad = blankSquad("test");
  assert.throws(
    () => assign(squad, fixturePlayers[0], 1, fixturePlayers),
    /Goalkeepers/,
  );
  const signed = assign(squad, fixturePlayers[16], 1, fixturePlayers);
  const changed = {
    ...fixturePlayers[16],
    game: { ...fixturePlayers[16].game, cost: 300 },
  };
  assert.equal(
    assign(signed, changed, 2, fixturePlayers).members[0].paid,
    signed.members[0].paid,
  );
  assert.throws(
    () => autofill({ ...squad, budget: 500 }, fixturePlayers),
    /budget/,
  );
  assert.throws(
    () =>
      simulate(squad, fixturePlayers, "balanced", 1, new Date().toISOString()),
    /11 positions/,
  );
});
test("imports reject duplicate identities and invalid player references", () => {
  const save = freshSave();
  save.players = [fixturePlayers[0], fixturePlayers[0]];
  assert.throws(() => validateSave(save));
  save.players = [];
  save.squads[0].members = [{ slot: "slot-0", playerId: "missing", paid: 10 }];
  assert.throws(() => validateSave(save));
});
test("baseline attributes and chart zero-variance behavior are explicit", () => {
  assert.equal(gameAttributes("GK").basis, "baseline");
  assert.equal(chartSummary([]).r, null);
  assert.equal(chartSummary(fixturePlayers.slice(0, 3)).r, null);
  const p = {
    ...fixturePlayers[0],
    game: { ...fixturePlayers[0].game, overall: 99, cost: 950 },
  };
  assert.ok(chartSummary([p]).cost >= 950);
});
