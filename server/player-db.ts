import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Catalog, Player, Role } from "../src/game/types";
import { ratePlayers } from "../src/game/ratings";
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV field");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header =
    rows.shift()?.map((s) => s.replace(/^\uFEFF/, "").trim()) || [];
  return rows.map((values) =>
    Object.fromEntries(header.map((h, i) => [h, values[i] || ""])),
  );
}
export const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|afc|football club)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 20);
const roleMap: Record<string, Role> = {
  GK: "GK",
  DF: "DEF",
  MF: "MID",
  FW: "FWD",
  DEF: "DEF",
  MID: "MID",
  FWD: "FWD",
};
const number = (v: string | undefined) =>
  v?.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined;
const nations: Record<string, string> = {
  USA: "United States",
  ENG: "England",
  FRA: "France",
  ESP: "Spain",
  GER: "Germany",
  ITA: "Italy",
  POR: "Portugal",
  NED: "Netherlands",
  BRA: "Brazil",
  ARG: "Argentina",
  NOR: "Norway",
  SCO: "Scotland",
  WAL: "Wales",
  IRL: "Ireland",
  MAR: "Morocco",
  COL: "Colombia",
  BEL: "Belgium",
  URU: "Uruguay",
  DEN: "Denmark",
  SWE: "Sweden",
  CRO: "Croatia",
  POL: "Poland",
  SUI: "Switzerland",
  JPN: "Japan",
  KOR: "South Korea",
  SEN: "Senegal",
  NGA: "Nigeria",
  EGY: "Egypt",
  GHA: "Ghana",
  CIV: "Ivory Coast",
  CAN: "Canada",
  MEX: "Mexico",
  AUT: "Austria",
  TUR: "Türkiye",
  UKR: "Ukraine",
  SRB: "Serbia",
  CZE: "Czech Republic",
  CMR: "Cameroon",
  ALG: "Algeria",
};
export function mergeCsv(full: string, light: string) {
  const rows = new Map<string, Record<string, string>>();
  for (const row of [...parseCsv(light), ...parseCsv(full)]) {
    if (!row.Player || !row.Pos || row.Player === "Player") continue;
    const key =
      normal(row.Player) +
      ":" +
      row.Born +
      ":" +
      row.Nation +
      ":" +
      normal(row.Squad);
    const previous = rows.get(key) || {};
    for (const [k, v] of Object.entries(row)) if (v.trim()) previous[k] = v;
    rows.set(key, previous);
  }
  return [...rows.values()];
}
export function csvPlayers(
  rows: Record<string, string>[],
  catalog: Catalog,
  fetchedAt: string,
): Player[] {
  const aliases: Record<string, string> = {
    manchesterutd: "manchesterunited",
    parissg: "parissaintgermain",
    psg: "parissaintgermain",
    atleticomadrid: "clubatleticodemadrid",
    betis: "realbetisbalompie",
    wolves: "wolverhamptonwanderers",
    nottmforest: "nottinghamforest",
    tottenham: "tottenhamhotspur",
    newcastleutd: "newcastleunited",
    brighton: "brightonhovealbion",
    westham: "westhamunited",
  };
  return rows.flatMap((row) => {
    const positions = row.Pos.split(",")
        .map((r) => roleMap[r.trim()])
        .filter(Boolean),
      role = positions[0];
    if (!role) return [];
    const clubKey = aliases[normal(row.Squad)] || normal(row.Squad);
    const team = catalog.teams.find(
      (t) => t.kind === "club" && normal(t.name) === clubKey,
    );
    const clubId = team?.id || `club:${digest(clubKey)}`,
      minutes = number(row.Min) || 0,
      per90 = (n: number) => (n * 90) / Math.max(90, minutes);
    const attack = number(row.Gls),
      assists = number(row.Ast),
      tackles = number(row.TklW),
      interceptions = number(row.Int),
      crosses = number(row.Crs),
      saves = number(row.Saves),
      cs = number(row.CS);
    const nation = (row.Nation || "").split(" ").pop() || "";
    const metrics = minutes > 0 ? {
      ...(role === "GK" && saves !== undefined
        ? { prevention: per90(saves + (cs || 0) * 3) }
        : tackles !== undefined || interceptions !== undefined
          ? { prevention: per90((tackles || 0) + (interceptions || 0)) }
          : {}),
      ...(crosses !== undefined || assists !== undefined
        ? { distribution: per90((crosses || 0) * 0.15 + (assists || 0)) }
        : {}),
      ...(attack !== undefined
        ? { attack: per90(attack + (assists || 0) * 0.7) }
        : {}),
    } : {};
    return [
      {
        id: `csv:${digest(normal(row.Player) + ":" + row.Born + ":" + row.Nation)}`,
        name: row.Player,
        born: number(row.Born),
        source: "CSV · 2026/27",
        season: Object.fromEntries(Object.entries({
          goals: number(row.Gls), assists: number(row.Ast), appearances: number(row.MP),
          shots: number(row.Sh), tackles: number(row.TklW), interceptions: number(row.Int),
          saves: number(row.Saves), cleanSheets: number(row.CS),
        }).filter((entry):entry is [string,number]=>entry[1]!==undefined)),
        role,
        secondary: positions.slice(1),
        club: row.Squad,
        clubId,
        league:
          catalog.competitions.find(
            (c) => c.kind === "league" && c.teamIds.includes(clubId),
          )?.id || row.Comp.replace(/^\w+\s+/, ""),
        nationality: nations[nation] || nation || null,
        minutes,
        metrics,
        appearances: [],
        teamStrength: team?.strength || 65,
        fetchedAt,
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
      },
    ];
  });
}
let database: DatabaseSync | undefined,
  lastSignature = "",
  lastCatalogRevision = "",
  loaded: Player[] | undefined;
function db() {
  if (!database) {
    fs.mkdirSync(path.resolve("data"), { recursive: true });
    database = new DatabaseSync(path.resolve("data/players.sqlite"));
    database.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, name TEXT NOT NULL, club TEXT, role TEXT NOT NULL, source TEXT NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS source_rows(identity TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);",
    );
  }
  return database;
}
export function playerDatabase(catalog: Catalog): {
  players: Player[];
  signature: string;
} {
  const files = [
    "players_data-2026_2027.csv",
    "players_data_light-2026_2027.csv",
  ];
  const signature = files
    .map((n) => {
      try {
        return fs.statSync(path.resolve("data", n)).mtimeMs;
      } catch {
        return 0;
      }
    })
    .join(":");
  const database = db();
  // Nothing upstream changed, so the stored rows are already the answer.
  if (
    loaded &&
    signature === lastSignature &&
    catalog.revision === lastCatalogRevision
  )
    return { players: loaded, signature };
  if (signature !== lastSignature || catalog.revision !== lastCatalogRevision) {
    const rows = mergeCsv(
      ...(files.map((n) => {
        try {
          return fs.readFileSync(path.resolve("data", n), "utf8");
        } catch {
          return "";
        }
      }) as [string, string]),
    );
    if (rows.length) {
      const date = new Date(
        Math.max(...signature.split(":").map(Number)),
      ).toISOString();
      const profiles = new Map<string,Player>();
      for (const p of csvPlayers(rows,catalog,date)) {
        const previous=profiles.get(p.id);
        // Multi-club CSV rows use the entry with most played minutes; all raw rows remain archived.
        if(!previous || p.minutes > previous.minutes) profiles.set(p.id,p);
      }
      const players = ratePlayers([...profiles.values()]);
      const insert = database.prepare(
        "INSERT INTO players(id,name,club,role,source,payload) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,club=excluded.club,role=excluded.role,payload=excluded.payload",
      );
      const raw = database.prepare(
        "INSERT OR REPLACE INTO source_rows(identity,payload) VALUES(?,?)",
      );
      database.exec("BEGIN");
      try {
        database.exec(
          "DELETE FROM players WHERE source='csv'; DELETE FROM source_rows;",
        );
        for (const p of players)
          insert.run(p.id, p.name, p.club, p.role, "csv", JSON.stringify(p));
        for (const row of rows)
          raw.run(
            digest(
              normal(row.Player) +
                ":" +
                row.Born +
                ":" +
                row.Nation +
                ":" +
                normal(row.Squad),
            ),
            JSON.stringify(row),
          );
        database
          .prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)")
          .run("csvSignature", signature);
        database.exec("COMMIT");
      } catch (e) {
        database.exec("ROLLBACK");
        throw e;
      }
    }
    lastSignature = signature;
    lastCatalogRevision = catalog.revision;
  }
  loaded = (
    database.prepare("SELECT payload FROM players ORDER BY id").all() as {
      payload: string;
    }[]
  ).map((r) => JSON.parse(r.payload));
  return { players: loaded, signature };
}
