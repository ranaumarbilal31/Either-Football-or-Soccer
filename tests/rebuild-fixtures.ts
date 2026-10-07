import {
  Catalog,
  Player,
  Role,
  Side,
  emptySquad,
  slotRoles,
} from "../src/game/types";
export function player(
  id: string,
  role: Role,
  rating = 7,
  club = "club",
): Player {
  return {
    id,
    name: `Player ${id}`,
    role,
    secondary: [],
    club,
    clubId: club,
    league: "PL",
    nationality: "England",
    minutes: 1800,
    metrics: {},
    appearances: [],
    teamStrength: 70,
    fetchedAt: "2026-10-05T00:00:00Z",
    rating,
    baseline: rating,
    form: null,
    confidence: 0.5,
    price: 6,
    estimated: true,
    attributes: {
      attack: rating * 10 * (role === "FWD" ? 1 : role === "MID" ? 0.84 : 0.5),
      defense: rating * 10 * (role === "DEF" ? 1 : role === "MID" ? 0.75 : 0.4),
      passing: rating * 10 * (role === "MID" ? 1 : 0.85),
      keeping: role === "GK" ? rating * 10 : 10,
      stamina: 85,
    },
  };
}
export function side(prefix: string, rating = 7): Side {
  const squad = emptySquad(),
    players = slotRoles(squad.formation).map((role, i) =>
      player(`${prefix}-${i}`, role, rating, prefix),
    );
  squad.ids = players.map((p) => p.id);
  return { name: prefix, squad, players };
}
export function fixtureCatalog(): Catalog {
  const sides = Array.from({ length: 16 }, (_, i) =>
    side(`club-${i}`, 6 + i / 20),
  );
  return {
    version: 3,
    revision: "test-v3",
    fetchedAt: "2026-10-05T00:00:00Z",
    players: sides.flatMap((s) => s.players),
    teams: sides.map((s, i) => ({
      id: `team-${i}`,
      name: s.name,
      country: "England",
      kind: "club",
      playerIds: s.players.map((p) => p.id),
      results: ["W", "D", "W"],
      style: "Balanced — limited data",
      strength: 70,
    })),
    competitions: [
      {
        id: "PL",
        name: "Premier League",
        kind: "league",
        teamIds: ["team-0", "team-1", "team-2"],
        complete: true,
      },
    ],
    notices: ["Test catalog; no real provider calls."],
  };
}
