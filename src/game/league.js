import { emptySquad } from "./types.js";
import { ranked, squadError } from "./ratings.js";
import { simulate } from "./engine.js";
function opponent(team, catalog) {
  const players = catalog.players.filter((p) => team.playerIds.includes(p.id));
  const s = emptySquad();
  const available = ranked(players);
  const slots = [
    "GK",
    ...Array(4).fill("DEF"),
    ...Array(3).fill("MID"),
    ...Array(3).fill("FWD"),
  ];
  s.ids = slots.map((role) => {
    const i = available.findIndex((p) => p.role === role);
    return i < 0 ? null : available.splice(i, 1)[0].id;
  });
  if (squadError(s, players)) return null;
  return { name: team.name, squad: s, players };
}
function schedule(ids) {
  const rotation = [...ids];
  if (rotation.length % 2) rotation.push("BYE");
  const out = [];
  for (let round = 0; round < rotation.length - 1; round++) {
    for (let i = 0; i < rotation.length / 2; i++) {
      const a = rotation[i],
        b = rotation[rotation.length - 1 - i];
      if (a === "BYE" || b === "BYE") continue;
      const [home, away] = (round + i) % 2 ? [a, b] : [b, a];
      out.push({ id: `${round}-${i}`, round: round + 1, home, away });
    }
    rotation.splice(1, 0, rotation.pop());
  }
  return [
    ...out,
    ...out.map((f) => ({
      ...f,
      id: `return-${f.id}`,
      round: f.round + rotation.length - 1,
      home: f.away,
      away: f.home,
    })),
  ];
}
function startLeague(comp, catalog, club) {
  if (!comp.complete || comp.kind !== "league")
    throw new Error("This league does not have complete coverage.");
  const sides = { user: structuredClone(club) };
  for (const id of comp.teamIds) {
    const team = catalog.teams.find((t) => t.id === id),
      side = team && opponent(team, catalog);
    if (!side)
      throw new Error(
        `${team?.name || "A club"} does not have a complete lineup yet.`,
      );
    sides[id] = side;
  }
  return {
    id: `season-${Date.now()}`,
    name: comp.name,
    snapshot: structuredClone(catalog),
    sides,
    fixtures: schedule(Object.keys(sides)),
  };
}
function playRound(league, squad, seed) {
  const copy = structuredClone(league);
  const pending = copy.fixtures.find((f) => !f.result);
  if (!pending) throw new Error("Season complete.");
  const error = squadError(squad, copy.snapshot.players);
  if (error) throw new Error(error);
  copy.sides.user.squad = structuredClone(squad);
  copy.sides.user.players = copy.snapshot.players.filter((p) =>
    squad.ids.includes(p.id),
  );
  for (const [i, f] of copy.fixtures.entries()) {
    if (f.round === pending.round && !f.result)
      f.result = simulate(copy.sides[f.home], copy.sides[f.away], seed + i);
  }
  return copy;
}
function standings(league) {
  const rows = Object.entries(league.sides).map(([id, s]) => ({
    id,
    name: s.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));
  for (const f of league.fixtures) {
    if (!f.result) continue;
    const a = rows.find((r) => r.id === f.home),
      b = rows.find((r) => r.id === f.away);
    const [x, y] = f.result.score;
    a.played++;
    b.played++;
    a.gf += x;
    a.ga += y;
    b.gf += y;
    b.ga += x;
    if (x === y) {
      a.drawn++;
      b.drawn++;
      a.points++;
      b.points++;
    } else {
      const win = x > y ? a : b,
        lose = x > y ? b : a;
      win.won++;
      win.points += 3;
      lose.lost++;
    }
  }
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  );
}
export { opponent, playRound, schedule, standings, startLeague };
