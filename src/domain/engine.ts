import { Match, MatchEvent, Player, Squad, slots } from "./model";
import { chemistry, squadError } from "./squad";

export const Opponents = {
  balanced: {
    name: "The Metropolitans",
    description: "Patient passing. Balanced lines.",
    tempo: 50,
    press: 45,
    line: 50,
    strength: 71,
  },
  press: {
    name: "Northside Athletic",
    description: "A high press that fades late.",
    tempo: 75,
    press: 85,
    line: 75,
    strength: 73,
  },
  counter: {
    name: "Harbour United",
    description: "A deep block. Quick on the break.",
    tempo: 80,
    press: 30,
    line: 25,
    strength: 72,
  },
} as const;
export type Opponent = keyof typeof Opponents;
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function simulate(
  squad: Squad,
  catalog: Player[],
  opponent: Opponent,
  seed: number,
  playedAt: string,
): Match {
  const error = squadError(squad, catalog, true);
  if (error) throw new Error(error);
  const players = squad.members.map((m) =>
    catalog.find((p) => p.id === m.playerId)!,
  );
  const random = seeded(seed);
  const opposition = Opponents[opponent];
  const events: MatchEvent[] = [];
  const add = (
    e: Partial<MatchEvent> & Pick<MatchEvent, "minute" | "type" | "text">,
  ) =>
    events.push({
      side: "none",
      playerId: "",
      xg: 0,
      target: false,
      completed: false,
      ...e,
    });
  const attribute = (key: keyof Player["game"]["attributes"]) =>
    players.reduce(
      (sum, p, i) =>
        sum +
        p.game.attributes[key] *
          (p.role ===
          slots(squad.formation)[Number(squad.members[i].slot.slice(5))]
            ? 1
            : 0.8),
      0,
    ) / 11;
  const homeControl = Math.max(
    0.32,
    Math.min(
      0.68,
      0.5 +
        (attribute("passing") - opposition.strength) / 160 +
        (50 - squad.tactics.tempo) / 600,
    ),
  );
  const ratings = players.map((p) => ({
    id: p.id,
    name: p.name,
    rating: 6,
    goals: 0,
    passes: 0,
    completed: 0,
    stamina: 100,
  }));
  add({
    minute: 0,
    type: "kickoff",
    text: `Kickoff. ${squad.name} face ${opposition.name}.`,
  });
  for (let minute = 1; minute <= 90; minute++) {
    for (let possession = 0; possession < 6; possession++) {
      const home = random() < homeControl;
      const side = home ? "home" : "away";
      const index = Math.floor(random() * 11);
      const p = players[index];
      const accuracy = home
        ? p.game.attributes.passing / 100 - squad.tactics.tempo / 700
        : 0.78 - opposition.tempo / 800;
      const completed = random() < accuracy;
      add({
        minute,
        side,
        type: "pass",
        playerId: home ? p.id : `opponent-${index}`,
        text: "",
        completed,
      });
      if (home) {
        ratings[index].passes++;
        if (completed) ratings[index].completed++;
      }
    }
    for (const side of ["home", "away"] as const) {
      const home = side === "home";
      const tempo = home ? squad.tactics.tempo : opposition.tempo;
      const press = home ? squad.tactics.press : opposition.press;
      const fatigue = 1 - (minute / 90) * (press / 100) * 0.22;
      const defense = home ? opposition.strength : attribute("defense");
      const chance =
        (0.095 +
          tempo / 1800 +
          (home ? chemistry(squad, players) / 1000 : 0.06)) *
        fatigue *
        Math.max(0.65, 1 - (defense - 60) / 160);
      if (random() > chance) continue;
      const attackers = players.filter(
        (p) => p.role === "FWD" || p.role === "MID",
      );
      const shooter =
        attackers[Math.floor(random() * attackers.length)] || players[1];
      const defendingLine = home ? opposition.line : squad.tactics.line;
      const attack = home
        ? shooter.game.attributes.attack
        : opposition.strength;
      const pace = home ? shooter.game.attributes.pace : opposition.strength;
      const xg = Number(
        Math.max(
          0.03,
          Math.min(
            0.55,
            0.06 +
              random() * 0.2 +
              (attack - 70) / 300 +
              ((pace - 70) * defendingLine) / 100_000 +
              defendingLine / 1600 -
              (defense - 60) / 700,
          ),
        ).toFixed(3),
      );
      const target = random() < 0.45;
      const goalkeeper = players.find((p) => p.role === "GK")!;
      const keeper = home ? 74 : goalkeeper.game.attributes.keeping;
      const goal =
        target &&
        random() < Math.min(0.9, (xg / 0.45) * (1 + (74 - keeper) / 150));
      const playerId = home ? shooter.id : "opponent-forward";
      add({
        minute,
        side,
        type: goal ? "goal" : target ? "save" : "shot",
        playerId,
        xg,
        target,
        text: goal
          ? `${home ? shooter.name : opposition.name} scores!`
          : target
            ? `${home ? shooter.name : opposition.name} forces a save.`
            : `${home ? shooter.name : opposition.name} shoots wide.`,
      });
      if (goal && home) ratings.find((r) => r.id === shooter.id)!.goals++;
    }
    if (minute === 45)
      add({
        minute,
        type: "half",
        text: "Half time. A moment to catch your breath.",
      });
  }
  add({
    minute: 90,
    type: "full",
    text: "Full time. The numbers tell the story.",
  });
  const stats = (side: "home" | "away") => {
    const own = events.filter((e) => e.side === side);
    const shots = own.filter((e) => ["shot", "goal", "save"].includes(e.type));
    const passes = own.filter((e) => e.type === "pass");
    return {
      goals: shots.filter((e) => e.type === "goal").length,
      shots: shots.length,
      onTarget: shots.filter((e) => e.target).length,
      xg: Number(shots.reduce((sum, e) => sum + e.xg, 0).toFixed(2)),
      passes: passes.length,
      completed: passes.filter((e) => e.completed).length,
      possession: 0,
    };
  };
  const home = stats("home"),
    away = stats("away");
  home.possession = Math.round(
    (home.passes / (home.passes + away.passes)) * 100,
  );
  away.possession = 100 - home.possession;
  ratings.forEach((r, i) => {
    r.stamina = Math.max(
      15,
      Math.round(
        players[i].game.attributes.stamina -
          15 -
          squad.tactics.press * 0.35 -
          squad.tactics.tempo * 0.12,
      ),
    );
    r.rating = Number(
      Math.max(
        1,
        Math.min(
          10,
          6 +
            r.goals * 0.85 +
            (r.completed / Math.max(1, r.passes) - 0.65) * 2 +
            (home.goals > away.goals ? 0.3 : 0) -
            (r.stamina < 30 ? 0.3 : 0),
        ),
      ).toFixed(1),
    );
  });
  const advice = [
    home.goals > away.goals
      ? "A win to build on. Compare the quality of your chances before changing a winning setup."
      : home.xg > away.xg
        ? "You created the better chances. One result is not enough to judge this setup."
        : "Your opponent created better chances. Try a more compact defensive line.",
    squad.tactics.press > 70
      ? "Your high press costs stamina. Lower pressing for a steadier final half hour."
      : "Your pressing leaves energy in reserve. Try raising it slightly against patient opponents.",
    chemistry(squad, players) < 100
      ? "Some players are out of position. Natural-role assignments improve their contribution."
      : "Every player is in a natural role. Experiment with tempo to change your passing risk.",
  ];
  return {
    id: `match-${seed}-${Date.parse(playedAt)}`,
    engine: 1,
    seed,
    playedAt,
    homeName: squad.name,
    awayName: opposition.name,
    squad: structuredClone(squad),
    players: structuredClone(players),
    opponent,
    events,
    home,
    away,
    ratings,
    advice,
  };
}
