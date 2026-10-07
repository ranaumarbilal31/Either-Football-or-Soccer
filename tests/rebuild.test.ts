import test from "node:test";
import assert from "node:assert/strict";
import {
  autoSquad,
  changeFormation,
  fit,
  metrics,
  ratePlayers,
  shortlist,
  squadError,
} from "../src/game/ratings";
import { emptySquad } from "../src/game/types";
import { simulate } from "../src/game/engine";
import {
  playRound,
  schedule,
  startLeague,
  standings,
} from "../src/game/league";
import { buildCatalog, identityMatch } from "../server/catalog-v3";
import { player, side, fixtureCatalog } from "./rebuild-fixtures";

test("fresh squad, shortlist, goalkeeper locks and price-aware auto-selection", () => {
  const c = fixtureCatalog();
  assert.equal(emptySquad().ids.filter(Boolean).length, 0);
  const saved = shortlist(c.players);
  assert.equal(saved.length, 60);
  for (const role of ["GK", "DEF", "MID", "FWD"])
    assert.equal(
      saved.filter((id) => c.players.find((p) => p.id === id)?.role === role)
        .length,
      15,
    );
  const s = autoSquad(emptySquad(), c.players, 70);
  assert.equal(squadError(s, c.players, 70), "");
  assert.ok(metrics(s, c.players).cost <= 70);
  assert.equal(fit(player("g", "GK"), "DEF"), 0);
  assert.equal(fit(player("a", "FWD"), "GK"), 0);
  assert.throws(() => autoSquad(s, c.players, 55), /budget/);
});
test("formation changes preserve unique players and natural slots where possible", () => {
  const s = side("club");
  const changed = changeFormation(s.squad, "4-4-2", s.players);
  assert.equal(changed.ids.filter(Boolean).length, 11);
  assert.equal(new Set(changed.ids).size, 11);
  assert.equal(changed.ids[0], s.squad.ids[0]);
  assert.equal(metrics(changed, s.players).positionalFit < 1, true);
});
test("missing stats are estimated, small samples shrink, recent form modifies price", () => {
  const base = player("a", "FWD");
  const missing = ratePlayers([base])[0];
  assert.equal(missing.estimated, true);
  assert.equal(missing.form, null);
  const good = ratePlayers([
    {
      ...base,
      appearances: Array.from({ length: 5 }, (_, i) => ({
        date: `2026-10-0${5 - i}T00:00:00Z`,
        fixture: String(i),
        grade: 10,
        minutes: 90,
      })),
    },
  ])[0];
  assert.ok(good.rating > missing.rating);
  assert.ok(good.price > missing.price);
  const once = ratePlayers([
    {
      ...base,
      appearances: [
        { date: "2026-10-05T00:00:00Z", fixture: "x", grade: 10, minutes: 90 },
      ],
    },
  ])[0];
  assert.ok(once.rating < good.rating);
  const peers = [0, 1, 2].map((n) => ({
    ...player(String(n), "FWD"),
    minutes: 90,
    metrics: { attack: n },
  }));
  const rated = ratePlayers(peers);
  assert.equal(rated[0].estimated, false);
  assert.ok(rated[2].baseline < 7);
  assert.ok(rated[0].baseline > 6);
});
test("chemistry uses neighboring links, missing affiliations and positional penalties", () => {
  const team = side("same");
  assert.equal(metrics(team.squad, team.players).chemistry, 100);
  const unrelated = team.players.map((p, i) => ({
    ...p,
    clubId: String(i),
    league: null,
    nationality: null,
  }));
  assert.equal(metrics(team.squad, unrelated).chemistry, 52);
  const ids = [...team.squad.ids];
  [ids[1], ids[10]] = [ids[10], ids[1]];
  const changed = metrics({ ...team.squad, ids }, team.players);
  assert.ok(changed.strength < metrics(team.squad, team.players).strength);
  assert.ok(changed.links.some((l) => l.color === "orange"));
});
test("provider identities require name, birth date, club and uniqueness", () => {
  const candidates = [
    { id: "a", name: "John Smith", dob: "2000-01-01", club: "Example FC" },
  ];
  assert.equal(
    identityMatch("John Smith", "2000-01-01", "Example", candidates),
    "a",
  );
  assert.equal(identityMatch("John Smith", null, "Example", candidates), null);
  assert.equal(
    identityMatch("John Smith", "2000-01-01", "Different", candidates),
    null,
  );
  assert.equal(
    identityMatch("John Smith", "2000-01-01", "Example", [
      ...candidates,
      { ...candidates[0], id: "b" },
    ]),
    null,
  );
});
test("one bad competition does not discard good snapshots", () => {
  const c = buildCatalog({
    competitions: [
      { bad: true },
      {
        code: "PL",
        fetchedAt: "2026-10-05T00:00:00Z",
        data: {
          competition: { id: 1, name: "League", type: "LEAGUE" },
          teams: [
            {
              id: 1,
              name: "One",
              area: { name: "England" },
              squad: [
                {
                  id: 1,
                  name: "Keeper",
                  position: "Goalkeeper",
                  nationality: "England",
                },
              ],
            },
          ],
        },
      },
    ],
  });
  assert.equal(c.players.length, 1);
  assert.ok(c.notices.some((n) => n.includes("invalid")));
});
test("simulation is repeatable and both teams grades and scores agree with events", () => {
  const a = side("a"),
    b = side("b");
  const m = simulate(a, b, 123, "2026-10-05T00:00:00Z");
  assert.deepEqual(m, simulate(a, b, 123, "2026-10-05T00:00:00Z"));
  assert.equal(m.grades.length, 22);
  for (const s of [0, 1]) {
    assert.equal(
      m.score[s],
      m.events.filter((e) => e.side === s && e.type === "goal").length,
    );
    assert.equal(
      m.score[s],
      m.grades.filter((g) => g.side === s).reduce((n, g) => n + g.goals, 0),
    );
    assert.equal(
      m.stats[s].onTarget,
      m.events.filter((e) => e.side === s && ["save", "goal"].includes(e.type))
        .length,
    );
  }
  assert.equal(m.stats[0].possession + m.stats[1].possession, 100);
});
test("league schedule covers each pair home and away with valid byes and frozen prices", () => {
  const fixtures = schedule(["a", "b", "c"]);
  assert.equal(fixtures.length, 6);
  assert.equal(new Set(fixtures.map((f) => `${f.home}-${f.away}`)).size, 6);
  for (const round of new Set(fixtures.map((f) => f.round))) {
    const ids = fixtures
      .filter((f) => f.round === round)
      .flatMap((f) => [f.home, f.away]);
    assert.equal(ids.length, new Set(ids).size);
  }
  const c = fixtureCatalog(),
    club = side("user");
  c.players.push(...club.players);
  const season = startLeague(c.competitions[0], c, club);
  const price = season.snapshot.players[0].price;
  c.players[0].price = 15;
  assert.equal(season.snapshot.players[0].price, price);
  let played = season;
  while (played.fixtures.some((f) => !f.result))
    played = playRound(played, club.squad, 42);
  assert.equal(played.fixtures.length, 12);
  assert.ok(standings(played).every((r) => r.played === 6));
});
