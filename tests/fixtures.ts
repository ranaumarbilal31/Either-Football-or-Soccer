import { gameAttributes, Player, Roles } from "../src/domain/model";
export const fixturePlayers: Player[] = Roles.flatMap((role, r) =>
  Array.from({ length: 16 }, (_, i) => ({
    id: `sportsdb:${r * 100 + i + 1}`,
    provider: "sportsdb" as const,
    providerId: String(r * 100 + i + 1),
    name: `Test ${role} ${String(i + 1).padStart(2, "0")}`,
    role,
    club: "Test Football Club",
    nationality: "Test country",
    image: null,
    fetchedAt: "2026-10-03T00:00:00.000Z",
    game: gameAttributes(role),
  })),
);
