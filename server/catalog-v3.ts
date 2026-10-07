import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Catalog, Player, Role, Team, Competition } from "../src/game/types";
import { ratePlayers, clamp } from "../src/game/ratings";
import { playerDatabase, normal as dbNormal } from "./player-db";
const root = path.resolve("data");
export const fplSchema = z.object({
  data: z.object({
    teams: z.array(z.object({ id: z.number(), name: z.string() })),
    elements: z.array(
      z.object({
        first_name: z.string(),
        second_name: z.string(),
        birth_date: z.string().nullable().optional(),
        team: z.number(),
        minutes: z.number(),
        goals_scored: z.number(),
        assists: z.number(),
        saves: z.number(),
        clean_sheets: z.number(),
        tackles: z.number().optional(),
        clearances_blocks_interceptions: z.number().optional(),
        creativity: z.coerce.number().optional(),
      }),
    ),
  }),
});
export const readData = (name: string): unknown => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  } catch {
    return null;
  }
};
const member = z.object({
  id: z.number(),
  name: z.string(),
  position: z.string().nullable(),
  nationality: z.string().nullable(),
  dateOfBirth: z.string().nullable().optional(),
});
export const entrySchema = z.object({
  code: z.string(),
  fetchedAt: z.string(),
  data: z.object({
    competition: z.object({
      id: z.number(),
      name: z.string(),
      type: z.string(),
    }),
    teams: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        area: z.object({ name: z.string() }),
        squad: z.array(member).optional(),
      }),
    ),
  }),
});
const liveSchema = z.object({ competitions: z.array(z.unknown()) });
export const resultSchema = z.object({
  matches: z.array(
    z.object({
      id: z.number(),
      utcDate: z.string(),
      status: z.string(),
      homeTeam: z.object({ id: z.number() }),
      awayTeam: z.object({ id: z.number() }),
      score: z.object({
        fullTime: z.object({
          home: z.number().nullable(),
          away: z.number().nullable(),
        }),
      }),
    }),
  ),
});
const appearanceSchema = z.object({
  date: z.string().datetime(),
  fixture: z.string(),
  grade: z.number().min(0).max(10),
  minutes: z.number().min(0).max(150),
});
const evidenceSchema = z.record(
  z.string(),
  z.object({
    minutes: z.number().nonnegative(),
    metrics: z.object({
      prevention: z.number().optional(),
      distribution: z.number().optional(),
      attack: z.number().optional(),
    }),
    appearances: z.array(appearanceSchema),
  }),
);
function roleFrom(value: string | null): Role | null {
  if (!value) return null;
  if (/goalkeeper|^gk$/i.test(value)) return "GK";
  if (/defen[cs]e|defender|back/i.test(value)) return "DEF";
  if (/midfield/i.test(value)) return "MID";
  if (/offen[cs]e|forward|winger|striker/i.test(value)) return "FWD";
  return null;
}
export function identityMatch(
  name: string,
  dob: string | null | undefined,
  club: string,
  candidates: {
    id: string;
    name: string;
    dob?: string | null;
    club: string | null;
  }[],
) {
  if (!dob) return null;
  const matches = candidates.filter(
    (p) =>
      p.dob === dob &&
      dbNormal(p.name) === dbNormal(name) &&
      dbNormal(p.club || "") === dbNormal(club),
  );
  return matches.length === 1 ? matches[0].id : null;
}
export function buildCatalog(
  raw: unknown,
  results: unknown = {},
  fpl: unknown = null,
  evidence: unknown = {},
): Catalog {
  const parsed = liveSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      "No valid saved catalog. Use Refresh data to load your provider.",
    );
  const players = new Map<string, Player>(),
    teams = new Map<string, Team>(),
    competitions: Competition[] = [],
    birthdays = new Map<string, string | null>(),
    notices: string[] = [];
  const resultFiles = z.record(z.string(), z.unknown()).safeParse(results);
  const matchMap = new Map<
    number,
    z.infer<typeof resultSchema>["matches"][number]
  >();
  if (resultFiles.success)
    for (const data of Object.values(resultFiles.data)) {
      const checked = resultSchema.safeParse(data);
      if (checked.success)
        for (const m of checked.data.matches)
          if (
            m.status === "FINISHED" &&
            m.score.fullTime.home !== null &&
            m.score.fullTime.away !== null
          )
            matchMap.set(m.id, m);
    }
  const matches = [...matchMap.values()].sort((a, b) =>
    a.utcDate.localeCompare(b.utcDate),
  );
  const elo = new Map<number, number>();
  for (const m of matches) {
    const a = elo.get(m.homeTeam.id) || 1500,
      b = elo.get(m.awayTeam.id) || 1500;
    const outcome =
      m.score.fullTime.home! > m.score.fullTime.away!
        ? 1
        : m.score.fullTime.home === m.score.fullTime.away
          ? 0.5
          : 0;
    const change = 24 * (outcome - 1 / (1 + 10 ** ((b - a) / 400)));
    elo.set(m.homeTeam.id, a + change);
    elo.set(m.awayTeam.id, b - change);
  }
  let fetchedAt = "";
  for (const candidate of parsed.data.competitions) {
    const checked = entrySchema.safeParse(candidate);
    if (!checked.success) {
      notices.push("One invalid competition snapshot was excluded.");
      continue;
    }
    const entry = checked.data;
    fetchedAt = entry.fetchedAt > fetchedAt ? entry.fetchedAt : fetchedAt;
    const national = ["WC", "EC"].includes(entry.code);
    const competition: Competition = {
      id: entry.code,
      name: entry.data.competition.name,
      kind: national
        ? "international"
        : entry.data.competition.type === "LEAGUE"
          ? "league"
          : "cup",
      teamIds: [],
      complete:
        entry.data.teams.length ===
        (
          {
            PL: 20,
            ELC: 24,
            PD: 20,
            BL1: 18,
            SA: 20,
            FL1: 18,
            DED: 18,
            PPL: 18,
            BSA: 20,
          } as Record<string, number>
        )[entry.code],
    };
    for (const t of entry.data.teams) {
      const id = `fd:${t.id}`;
      competition.teamIds.push(id);
      const strength = clamp(65 + ((elo.get(t.id) || 1500) - 1500) / 8, 35, 95);
      const recent = matches
        .filter((m) => m.homeTeam.id === t.id || m.awayTeam.id === t.id)
        .slice(-5)
        .reverse()
        .map((m) => {
          const home = m.homeTeam.id === t.id;
          const a = m.score.fullTime[home ? "home" : "away"]!,
            b = m.score.fullTime[home ? "away" : "home"]!;
          return a > b ? "W" : a === b ? "D" : "L";
        });
      const ids: string[] = [];
      for (const p of t.squad || []) {
        const role = roleFrom(p.position);
        if (!role) continue;
        const pid = `fd:${p.id}`;
        ids.push(pid);
        const existing = players.get(pid);
        if (existing && (national || existing.clubId)) continue;
        birthdays.set(pid, p.dateOfBirth || null);
        players.set(pid, {
          born: p.dateOfBirth ? Number(p.dateOfBirth.slice(0, 4)) : undefined,
          id: pid,
          name: p.name,
          role,
          secondary: [],
          club: national ? null : t.name,
          clubId: national ? null : id,
          league: competition.kind === "league" ? competition.id : null,
          nationality: p.nationality,
          minutes: 0,
          metrics: {},
          appearances: [],
          teamStrength: strength,
          fetchedAt: entry.fetchedAt,
          rating: 0,
          baseline: 0,
          form: null,
          confidence: 0,
          price: 0,
          estimated: true,
          attributes: {
            attack: 0,
            defense: 0,
            passing: 0,
            keeping: 0,
            stamina: 0,
          },
        });
      }
      const old = teams.get(id);
      if (!old || ids.length > old.playerIds.length)
        teams.set(id, {
          id,
          name: t.name,
          kind: national ? "national" : "club",
          country: t.area.name,
          playerIds: ids,
          results: recent,
          style: "Balanced — limited data",
          strength,
        });
    }
    competitions.push(competition);
  }
  // Only exact full name + birth date + normalized club uniquely establish a cross-provider identity.

  const fantasy = fplSchema.safeParse(fpl);
  let linked = 0;
  if (fantasy.success) {
    const candidates = [...players.values()].map((p) => ({
      ...p,
      dob: birthdays.get(p.id),
    }));
    for (const p of fantasy.data.data.elements) {
      const club = fantasy.data.data.teams.find((t) => t.id === p.team)?.name;
      if (!club) continue;
      const id = identityMatch(
        `${p.first_name} ${p.second_name}`,
        p.birth_date,
        club,
        candidates,
      );
      if (!id) continue;
      const existing = players.get(id)!;
      const per90 = (n: number) => (p.minutes > 0 ? (n * 90) / p.minutes : 0);
      existing.minutes = p.minutes;
      existing.metrics =
        p.minutes > 0
          ? {
              prevention: per90(
                existing.role === "GK"
                  ? p.saves + p.clean_sheets * 3
                  : (p.tackles || 0) + (p.clearances_blocks_interceptions || 0),
              ),
              ...(p.creativity !== undefined
                ? { distribution: per90(p.creativity) }
                : {}),
              attack: per90(p.goals_scored + p.assists * 0.7),
            }
          : {};
      linked++;
    }
  }
  const supplied = evidenceSchema.safeParse(evidence);
  if (supplied.success)
    for (const [id, e] of Object.entries(supplied.data)) {
      const p = players.get(id);
      if (p) {
        p.minutes = e.minutes;
        p.metrics = e.metrics;
        p.appearances = e.appearances;
      }
    }
  if (!matches.length)
    notices.push(
      "Team result history has not been refreshed. Club strength currently uses a neutral estimate.",
    );
  notices.push(
    `${linked} player profiles linked to FPL by full name, birth date and club.`,
    "Individual last-five form appears only when verified appearance data is available. An additional statistics provider has not been selected.",
  );
  const rated = ratePlayers([...players.values()]);
  return {
    version: 3,
    revision: createHash("sha256")
      .update(JSON.stringify([raw, results, fpl, evidence]))
      .digest("hex")
      .slice(0, 16),
    fetchedAt,
    players: rated,
    teams: [...teams.values()],
    competitions,
    notices,
  };
}
let cache: Catalog | undefined,
  signature = "";
function baseCatalog() {
  const files = [
    "football-live.json",
    "football-results.json",
    "fpl-live.json",
    "player-evidence.json",
  ];
  const next = files
    .map((name) => {
      try {
        return fs.statSync(path.join(root, name)).mtimeMs;
      } catch {
        return 0;
      }
    })
    .join(":");
  if (cache && signature === next) return cache;
  cache = buildCatalog(
    ...(files.map(readData) as [unknown, unknown, unknown, unknown]),
  );
  signature = next;
  return cache;
}
function mergeDatabase(own: Player[], base: Catalog, signature: string) {
  const byKey = new Map<string, Player[]>();
  for (const p of own) {
    const key = dbNormal(p.name) + ":" + dbNormal(p.club || "");
    byKey.set(key, [...(byKey.get(key) || []), p]);
  }
  const mapped = new Map<string, string>();
  for (const p of base.players) {
    const matches = (
      byKey.get(dbNormal(p.name) + ":" + dbNormal(p.club || "")) || []
    ).filter((c) => p.born !== undefined && c.born === p.born);
    if (matches.length === 1) mapped.set(p.id, matches[0].id);
  }
  const ownIds = new Set(own.map((p) => p.id));
  return {
    ...base,
    revision: createHash("sha256")
      .update(base.revision + signature + own.map((p) => p.id).join())
      .digest("hex")
      .slice(0, 16),
    players: [
      ...own,
      ...base.players.filter((p) => !mapped.has(p.id) && !ownIds.has(p.id)),
    ],
    teams: base.teams.map((t) => ({
      ...t,
      playerIds: [...new Set(t.playerIds.map((id) => mapped.get(id) || id))],
    })),
    availableIds: own.map((p) => p.id),
    notices: [],
  };
}
// The merged catalog is what every request and live search reads, so it is built
// once per distinct provider snapshot rather than once per request.
let merged: Catalog | undefined,
  mergedKey = "";
export function catalog(): Catalog {
  const base = baseCatalog(),
    database = playerDatabase(base),
    key = base.revision + ":" + database.signature;
  if (merged && mergedKey === key) return merged;
  const next = database.players.length
    ? mergeDatabase(database.players, base, database.signature)
    : base;
  merged = next;
  mergedKey = key;
  return next;
}
