import { z } from "zod";
import { matchLimit } from "./types.js";
const text = z.string().min(1).max(200),
  role = z.enum(["GK", "DEF", "MID", "FWD"]);
const finite = z.number().finite();
const player = z.object({
  born: finite.optional(),
  source: z.string().optional(),
  season: z.record(z.string(), finite).optional(),
  id: text,
  name: text,
  role,
  secondary: z.array(role),
  club: text.nullable(),
  clubId: text.nullable(),
  league: text.nullable(),
  nationality: text.nullable(),
  minutes: finite.nonnegative(),
  metrics: z.object({
    prevention: finite.optional(),
    distribution: finite.optional(),
    attack: finite.optional(),
  }),
  appearances: z.array(
    z.object({
      date: text,
      fixture: text,
      grade: finite.min(0).max(10),
      minutes: finite.nonnegative(),
    }),
  ),
  teamStrength: finite,
  fetchedAt: text,
  rating: finite.min(0).max(10),
  baseline: finite,
  form: finite.nullable(),
  confidence: finite.min(0).max(1),
  price: finite.min(3).max(15),
  estimated: z.boolean(),
  attributes: z.object({
    attack: finite,
    defense: finite,
    passing: finite,
    keeping: finite,
    stamina: finite,
  }),
});
const squad = z.object({
  formation: z.enum(["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "5-3-2"]),
  ids: z.array(text.nullable()).length(11),
  tactics: z.object({
    tempo: finite.min(0).max(100),
    press: finite.min(0).max(100),
    line: finite.min(0).max(100),
  }),
});
const stat = z.object({
  shots: finite.nonnegative(),
  onTarget: finite.nonnegative(),
  xg: finite.nonnegative(),
  possession: finite.min(0).max(100),
});
const match = z.object({
  version: z.literal(3),
  id: text,
  seed: finite,
  playedAt: text,
  names: z.tuple([text, text]),
  score: z.tuple([finite.nonnegative(), finite.nonnegative()]),
  events: z.array(
    z.object({
      minute: finite,
      side: z.union([z.literal(0), z.literal(1)]),
      type: z.enum(["pass", "shot", "save", "goal", "tackle", "error"]),
      playerId: text,
      otherId: text.optional(),
      assistId: text.optional(),
      completed: z.boolean().optional(),
      xg: finite.optional(),
    }),
  ),
  grades: z.array(
    z.object({
      id: text,
      name: text,
      side: z.union([z.literal(0), z.literal(1)]),
      role,
      rating: finite.min(1).max(10),
      goals: finite,
      assists: finite,
      saves: finite,
      tackles: finite,
      passes: finite,
      completed: finite,
      errors: finite,
    }),
  ),
  stats: z.array(stat).length(2),
  strengths: z.array(finite).length(2),
  chemistry: z.array(finite).length(2),
  report: z.array(z.string().max(2e3)).max(10),
});
const catalog = z.object({
  version: z.literal(3),
  revision: text,
  fetchedAt: text,
  players: z.array(player),
  teams: z.array(
    z.object({
      id: text,
      name: text,
      kind: z.enum(["club", "national"]),
      country: z.string(),
      playerIds: z.array(text),
      results: z.array(z.enum(["W", "D", "L"])),
      style: text,
      strength: finite,
    }),
  ),
  competitions: z.array(
    z.object({
      id: text,
      name: text,
      kind: z.enum(["league", "international", "cup"]),
      teamIds: z.array(text),
      complete: z.boolean(),
    }),
  ),
  notices: z.array(z.string()),
});
const saveSchema = z.object({
  version: z.literal(3),
  club: z
    .object({
      name: text,
      manager: text,
      difficulty: text,
      budget: finite.min(55).max(200),
    })
    .nullable(),
  squad,
  savedIds: z.array(text),
  matches: z.array(match).max(matchLimit),
  league: z
    .object({
      id: text,
      name: text,
      snapshot: catalog,
      sides: z.record(
        z.string(),
        z.object({ name: text, squad, players: z.array(player) }),
      ),
      fixtures: z.array(
        z.object({
          id: text,
          round: finite,
          home: text,
          away: text,
          result: match.optional(),
        }),
      ),
    })
    .nullable(),
});
export { saveSchema };
