import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../src/game/engine";
import { side } from "./rebuild-fixtures";
test(
  "10,000-seed batches: balance, strength, chemistry and positional damage",
  { timeout: 240000 },
  () => {
    const equalA = side("a", 7),
      equalB = side("b", 7),
      strong = side("strong", 9),
      weak = side("weak", 6);
    const disconnected = {
      ...strong,
      players: strong.players.map((p, i) => ({
        ...p,
        clubId: String(i),
        league: null,
        nationality: null,
      })),
    };
    const misplaced = structuredClone(strong);
    [misplaced.squad.ids[1], misplaced.squad.ids[10]] = [
      misplaced.squad.ids[10],
      misplaced.squad.ids[1],
    ];
    let equalHome = 0,
      equalAway = 0,
      strongWins = 0,
      losses = 0,
      connectedDiff = 0,
      disconnectedDiff = 0,
      normalConceded = 0,
      misplacedConceded = 0;
    for (let seed = 1; seed <= 10000; seed++) {
      const e = simulate(equalA, equalB, seed, "2026-10-05T00:00:00Z");
      if (e.score[0] > e.score[1]) equalHome++;
      if (e.score[1] > e.score[0]) equalAway++;
      const s = simulate(strong, weak, seed, "2026-10-05T00:00:00Z");
      strongWins += Number(s.score[0] > s.score[1]);
      losses += Number(s.score[0] < s.score[1]);
      const c = simulate(strong, equalB, seed, "2026-10-05T00:00:00Z"),
        d = simulate(disconnected, equalB, seed, "2026-10-05T00:00:00Z"),
        m = simulate(misplaced, equalB, seed, "2026-10-05T00:00:00Z");
      connectedDiff += c.score[0] - c.score[1];
      disconnectedDiff += d.score[0] - d.score[1];
      normalConceded += c.score[1];
      misplacedConceded += m.score[1];
    }
    console.log(
      JSON.stringify({
        equalHome,
        equalAway,
        strongWinPercent: strongWins / 100,
        upsets: losses,
        connectedDiff,
        disconnectedDiff,
        normalConceded,
        misplacedConceded,
      }),
    );
    assert.ok(
      Math.abs(equalHome - equalAway) < 300,
      "equal teams should be symmetric",
    );
    assert.ok(strongWins >= 7500, "stronger team should win at least 75%");
    assert.ok(losses > 0, "upsets remain possible");
    assert.ok(
      connectedDiff > disconnectedDiff,
      "low chemistry must damage results",
    );
    assert.ok(
      misplacedConceded > normalConceded,
      "misplaced forwards must weaken defense",
    );
  },
);
