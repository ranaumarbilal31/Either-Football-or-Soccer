import { z } from "zod";

export const Roles = ["GK", "DEF", "MID", "FWD"] as const;
export const RoleSchema = z.enum(Roles);
export type Role = z.infer<typeof RoleSchema>;
export const Formations = {
  "4-3-3": [4, 3, 3],
  "4-4-2": [4, 4, 2],
  "4-2-3-1": [4, 5, 1],
  "3-5-2": [3, 5, 2],
  "5-3-2": [5, 3, 2],
} as const;
export const FormationSchema = z.enum([
  "4-3-3",
  "4-4-2",
  "4-2-3-1",
  "3-5-2",
  "5-3-2",
]);
export type Formation = keyof typeof Formations;
const score = z.number().int().min(1).max(99);
const label = z.string().trim().min(1).max(160);
export const AttributesSchema = z.object({
  attack: score,
  passing: score,
  defense: score,
  pace: score,
  stamina: score,
  keeping: score,
});
export type Attributes = z.infer<typeof AttributesSchema>;
export const PlayerSchema = z.object({
  id: label,
  provider: z.enum(["sportsdb", "rapidapi", "legacy"]),
  providerId: label,
  name: label,
  role: RoleSchema.nullable(),
  club: label.nullable(),
  nationality: label.nullable(),
  image: z
    .string()
    .url()
    .max(1000)
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        ["www.thesportsdb.com", "r2.thesportsdb.com"].includes(u.hostname)
      );
    }, "Untrusted image host")
    .nullable(),
  fetchedAt: z.string().datetime(),
  game: z.object({
    version: z.literal(1),
    basis: z.enum(["baseline", "statistics", "legacy"]),
    overall: score,
    cost: z.number().int().min(1).max(1000),
    attributes: AttributesSchema,
  }),
});
export type Player = z.infer<typeof PlayerSchema>;
export const TacticsSchema = z.object({
  tempo: z.number().int().min(0).max(100),
  press: z.number().int().min(0).max(100),
  line: z.number().int().min(0).max(100),
});
export const SquadSchema = z.object({
  id: label,
  name: label,
  formation: FormationSchema,
  budget: z.number().int().min(500).max(5000),
  tactics: TacticsSchema,
  members: z
    .array(
      z.object({
        slot: z.string().max(20),
        playerId: label,
        paid: z.number().int().min(1).max(1000),
      }),
    )
    .max(11),
});
export type Squad = z.infer<typeof SquadSchema>;
export const EventSchema = z.object({
  minute: z.number().int().min(0).max(90),
  side: z.enum(["home", "away", "none"]),
  type: z.enum(["kickoff", "pass", "shot", "goal", "save", "half", "full"]),
  playerId: z.string(),
  text: z.string().max(500),
  xg: z.number().min(0).max(1),
  target: z.boolean(),
  completed: z.boolean(),
});
export type MatchEvent = z.infer<typeof EventSchema>;
const count = z.number().int().min(0).max(2000);
const StatsSchema = z.object({
  goals: count,
  shots: count,
  onTarget: count,
  xg: z.number().min(0).max(2000),
  passes: count,
  completed: count,
  possession: z.number().int().min(0).max(100),
});
export const MatchSchema = z.object({
  id: label,
  seed: z.number().int(),
  playedAt: z.string().datetime(),
  engine: z.literal(1),
  homeName: label,
  awayName: label,
  squad: SquadSchema,
  players: z.array(PlayerSchema).max(11),
  opponent: z.enum(["balanced", "press", "counter"]),
  events: z.array(EventSchema).max(2000),
  home: StatsSchema,
  away: StatsSchema,
  ratings: z
    .array(
      z.object({
        id: label,
        name: label,
        rating: z.number().min(1).max(10),
        goals: z.number(),
        passes: z.number(),
        completed: z.number(),
        stamina: z.number(),
      }),
    )
    .max(11),
  advice: z.array(z.string().max(500)).max(8),
});
export type Match = z.infer<typeof MatchSchema>;
export const SaveSchema = z.object({
  version: z.literal(2),
  revision: z.number().int().min(0),
  activeId: label,
  squads: z.array(SquadSchema).min(1).max(30),
  players: z.array(PlayerSchema).max(2000),
  shortlist: z.array(label).max(2000),
  matches: z.array(MatchSchema).max(50),
});
export type Save = z.infer<typeof SaveSchema>;
export const PageSchema = z.object({
  players: z.array(PlayerSchema).max(20),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pages: z.number().int().min(1),
  stale: z.boolean(),
  source: z.string(),
  message: z.string().optional(),
});
export const slots = (formation: Formation): Role[] => [
  "GK",
  ...Formations[formation].flatMap((n, i) => Array<Role>(n).fill(Roles[i + 1])),
];
export const slotId = (index: number) => `slot-${index}`;
export function blankSquad(
  id: string = crypto.randomUUID(),
  name = "Touchline FC",
): Squad {
  return {
    id,
    name,
    formation: "4-3-3",
    budget: 1000,
    tactics: { tempo: 50, press: 50, line: 50 },
    members: [],
  };
}
export function freshSave(): Save {
  const squad = blankSquad();
  return {
    version: 2,
    revision: 0,
    activeId: squad.id,
    squads: [squad],
    players: [],
    shortlist: [],
    matches: [],
  };
}

export function gameAttributes(
  role: Role | null,
  stats?: Partial<Attributes>,
): Player["game"] {
  const baseline: Record<Role, Attributes> = {
    GK: {
      attack: 25,
      passing: 60,
      defense: 55,
      pace: 40,
      stamina: 70,
      keeping: 76,
    },
    DEF: {
      attack: 48,
      passing: 65,
      defense: 76,
      pace: 65,
      stamina: 75,
      keeping: 10,
    },
    MID: {
      attack: 65,
      passing: 77,
      defense: 60,
      pace: 69,
      stamina: 78,
      keeping: 10,
    },
    FWD: {
      attack: 78,
      passing: 65,
      defense: 35,
      pace: 77,
      stamina: 70,
      keeping: 10,
    },
  };
  const attributes = { ...baseline[role || "MID"] };
  let supplied = false;
  for (const key of Object.keys(attributes) as (keyof Attributes)[]) {
    const value = stats?.[key];
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 99
    ) {
      attributes[key] = Math.round(value);
      supplied = true;
    }
  }
  const a = attributes;
  const overall = Math.round(
    role === "GK"
      ? a.keeping * 0.7 + a.passing * 0.15 + a.stamina * 0.15
      : role === "DEF"
        ? a.defense * 0.55 + a.passing * 0.2 + a.pace * 0.1 + a.stamina * 0.15
        : role === "FWD"
          ? a.attack * 0.55 + a.pace * 0.25 + a.passing * 0.1 + a.stamina * 0.1
          : a.passing * 0.4 +
            a.attack * 0.2 +
            a.defense * 0.15 +
            a.stamina * 0.25,
  );
  return {
    version: 1,
    basis: supplied ? "statistics" : "baseline",
    overall,
    cost: Math.max(20, Math.round(30 + (overall - 50) ** 2 / 14)),
    attributes,
  };
}
