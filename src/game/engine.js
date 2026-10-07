import { slotRoles } from "./types.js";
import { clamp, fit, metrics, squadError } from "./ratings.js";
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state += 1831565813;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function createMatchSession(
  home,
  away,
  seed,
  playedAt = /* @__PURE__ */ new Date().toISOString(),
) {
  const sides = structuredClone([home, away]);
  for (const side of sides) {
    const error = squadError(side.squad, side.players);
    if (error) throw new Error(error);
  }
  const random = seeded(seed),
    summary = sides.map((s) => metrics(s.squad, s.players));
  const selected = sides.map((s) =>
    s.squad.ids.map((id) => s.players.find((p) => p.id === id)),
  );
  const grades = selected.flatMap((ps, side) =>
    ps.map((p) => ({
      id: p.id,
      name: p.name,
      side,
      role: p.role,
      rating: 6,
      goals: 0,
      assists: 0,
      saves: 0,
      tackles: 0,
      passes: 0,
      completed: 0,
      errors: 0,
    })),
  );
  const grade = (side, id) =>
    grades.find((g) => g.side === side && g.id === id);
  const events = [];
  const score = [0, 0];
  const lineStrength = (side, role) => {
    const slots = slotRoles(sides[side].squad.formation);
    const values = selected[side].flatMap((p, i) =>
      slots[i] === role
        ? [
            p.attributes[
              role === "DEF" ? "defense" : role === "MID" ? "passing" : "attack"
            ] * fit(p, slots[i]),
          ]
        : [],
    );
    return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  };
  const attack = sides.map(
    (_, i) => 0.7 * summary[i].strength + 0.3 * lineStrength(i, "FWD"),
  );
  const defense = sides.map(
    (_, i) => 0.7 * summary[i].strength + 0.3 * lineStrength(i, "DEF"),
  );
  const control = sides.map(
    (_, i) => 0.7 * summary[i].strength + 0.3 * lineStrength(i, "MID"),
  );
  let minute = 0;
  function step() {
    if (minute >= 90) return [];
    minute++;
    const start = events.length;
    for (let touch = 0; touch < 4; touch++) {
      const side =
        random() < clamp(0.5 + (control[0] - control[1]) / 150, 0.2, 0.8)
          ? 0
          : 1;
      const other = side === 0 ? 1 : 0;
      const ps = selected[side],
        i = 1 + Math.floor(random() * 10),
        p = ps[i];
      const tactical = sides[side].squad.tactics;
      const fatigue =
        1 -
        (minute / 90) *
          (tactical.press / 100) *
          0.16 *
          (85 / Math.max(40, p.attributes.stamina));
      const accuracy = clamp(
        (0.55 +
          p.attributes.passing / 300 +
          (0.08 * summary[side].chemistry) / 100 -
          tactical.tempo / 1e3) *
          fit(p, slotRoles(sides[side].squad.formation)[i]) *
          fatigue,
        0.25,
        0.96,
      );
      const completed = random() < accuracy;
      events.push({ minute, side, type: "pass", playerId: p.id, completed });
      grade(side, p.id).passes++;
      if (completed) grade(side, p.id).completed++;
      else {
        const defender =
          selected[other][
            1 +
              Math.floor(
                random() *
                  sides[other].squad.formation.split("-").map(Number)[0],
              )
          ];
        events.push({
          minute,
          side: other,
          type: "tackle",
          playerId: defender.id,
        });
        grade(other, defender.id).tackles++;
        if (random() < 0.04) {
          events.push({ minute, side, type: "error", playerId: p.id });
          grade(side, p.id).errors++;
        }
      }
    }
    for (const side of [0, 1]) {
      const other = side === 0 ? 1 : 0;
      const t = sides[side].squad.tactics,
        ot = sides[other].squad.tactics;
      const stamina =
        selected[side].reduce((n, p) => n + p.attributes.stamina, 0) / 11;
      const fatigue =
        1 -
        (((minute / 90) * t.press) / 100) * 0.2 * (85 / Math.max(40, stamina));
      const delta = attack[side] - defense[other];
      const tactical =
        1 +
        (t.tempo - 50) / 500 +
        (t.press - 50) / 800 -
        (ot.press - 50) / 1100;
      const chance = clamp(
        0.11 * Math.exp(0.014 * delta) * fatigue * tactical,
        0.018,
        0.55,
      );
      if (random() > chance) continue;
      const slots = slotRoles(sides[side].squad.formation);
      const shooters = selected[side].filter(
        (_, i) => slots[i] === "FWD" || slots[i] === "MID",
      );
      const shooter = shooters[Math.floor(random() * shooters.length)];
      const keeper = selected[other][0];
      const xg = clamp(
        0.18 *
          Math.exp(7e-3 * delta) *
          (0.55 + random() * 0.9) *
          (1 + (ot.line - 50) / 450),
        0.025,
        0.7,
      );
      const target =
        random() <
        clamp(0.45 + (shooter.attributes.attack - 70) / 300, 0.3, 0.65);
      const goal =
        target &&
        random() <
          clamp(
            (xg / 0.5) * (1 + (70 - keeper.attributes.keeping) / 220),
            0.02,
            0.92,
          );
      const assister = shooters.filter((p) => p.id !== shooter.id)[
        Math.floor(random() * Math.max(1, shooters.length - 1))
      ];
      events.push({
        minute,
        side,
        type: goal ? "goal" : target ? "save" : "shot",
        playerId: shooter.id,
        otherId: keeper.id,
        assistId: goal ? assister?.id : void 0,
        xg,
      });
      if (goal) {
        score[side]++;
        grade(side, shooter.id).goals++;
        if (assister) grade(side, assister.id).assists++;
      } else if (target) grade(other, keeper.id).saves++;
    }
    return events.slice(start);
  }
  function finish() {
    if (minute !== 90) throw new Error("The match has not finished.");
    const stats = sides.map((_, side) => {
      const own = events.filter((e) => e.side === side),
        shots = own.filter((e) => ["shot", "save", "goal"].includes(e.type));
      return {
        shots: shots.length,
        onTarget: shots.filter((e) => e.type !== "shot").length,
        xg: Math.round(shots.reduce((n, e) => n + (e.xg || 0), 0) * 100) / 100,
        possession: Math.round(
          (own.filter((e) => e.type === "pass").length / 360) * 100,
        ),
      };
    });
    stats[1].possession = 100 - stats[0].possession;
    for (const g of grades) {
      const conceded = score[g.side === 0 ? 1 : 0];
      g.rating =
        Math.round(
          clamp(
            6 +
              g.goals * (g.role === "FWD" ? 0.8 : 1) +
              g.assists * 0.55 +
              g.saves * 0.14 +
              Math.min(0.65, g.tackles * 0.035) +
              (g.passes ? (g.completed / g.passes - 0.7) * 1.5 : 0) -
              g.errors * 0.4 +
              (["GK", "DEF"].includes(g.role)
                ? conceded === 0
                  ? 0.6
                  : -conceded * 0.18
                : 0) +
              (score[g.side] > conceded ? 0.2 : 0),
            1,
            10,
          ) * 10,
        ) / 10;
    }
    const report = [
      `${home.name} ${score[0]}\u2013${score[1]} ${away.name}. ${stats[0].shots}\u2013${stats[1].shots} shots and ${stats[0].xg.toFixed(2)}\u2013${stats[1].xg.toFixed(2)} expected goals.`,
      ...sides.map(
        (s, i) =>
          `${s.name}: ${Math.round(summary[i].strength)} effective strength and ${Math.round(summary[i].chemistry)} chemistry.${summary[i].positionalFit < 0.99 ? " Out-of-position selections reduced coordinated play and positional contributions." : " Every player occupied a natural position."}`,
      ),
    ];
    const best = [...grades].sort(
      (a, b) =>
        b.rating - a.rating || b.goals - a.goals || a.id.localeCompare(b.id),
    )[0];
    report.push(
      `Player of the match: ${best.name} (${best.rating.toFixed(1)}/10). These are simulated performances.`,
    );
    return {
      version: 3,
      id: `match-${seed}-${Date.parse(playedAt)}`,
      seed,
      playedAt,
      names: [home.name, away.name],
      score,
      events,
      grades,
      stats,
      strengths: summary.map((m) => m.strength),
      chemistry: summary.map((m) => m.chemistry),
      report,
    };
  }
  return {
    get minute() {
      return minute;
    },
    get score() {
      return [...score];
    },
    get events() {
      return [...events];
    },
    get sides() {
      return structuredClone(sides);
    },
    step,
    finish,
    updateTactics(side, tactics) {
      if (minute >= 90) throw new Error("The match has finished.");
      sides[side].squad.tactics = Object.fromEntries(
        Object.entries(tactics).map(([k, v]) => [k, clamp(v, 0, 100)]),
      );
    },
    updateSquad(side, squad) {
      if (minute >= 90) throw new Error("The match has finished.");
      const error = squadError(squad, sides[side].players);
      if (error) throw new Error(error);
      if (squad.ids.some((id) => !selected[side].some((p) => p.id === id)))
        throw new Error(
          "Formation changes must preserve the participating eleven.",
        );
      sides[side].squad = structuredClone(squad);
      selected[side] = squad.ids.map((id) =>
        sides[side].players.find((p) => p.id === id),
      );
      summary[side] = metrics(squad, sides[side].players);
      attack[side] =
        0.7 * summary[side].strength + 0.3 * lineStrength(side, "FWD");
      defense[side] =
        0.7 * summary[side].strength + 0.3 * lineStrength(side, "DEF");
      control[side] =
        0.7 * summary[side].strength + 0.3 * lineStrength(side, "MID");
    },
  };
}
function simulate(
  home,
  away,
  seed,
  playedAt = /* @__PURE__ */ new Date().toISOString(),
) {
  const session = createMatchSession(home, away, seed, playedAt);
  while (session.minute < 90) session.step();
  return session.finish();
}
export { createMatchSession, simulate };
