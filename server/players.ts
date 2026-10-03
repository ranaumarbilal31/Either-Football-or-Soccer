import { z } from "zod";
import {
  gameAttributes,
  Player,
  PlayerSchema,
  Role,
} from "../src/domain/model";

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
type Entry = { value: unknown; time: number };
export class ProviderCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<
    string,
    Promise<{ value: unknown; stale: boolean }>
  >();
  private count = 0;
  private minute = 0;
  private blockedUntil = 0;
  constructor(
    private fetcher: typeof fetch = fetch,
    private now = Date.now,
  ) {}
  async get(
    key: string,
    url: string,
    headers: Record<string, string> = {},
    limit = 25,
  ): Promise<{ value: unknown; stale: boolean }> {
    const cached = this.entries.get(key);
    const now = this.now();
    if (cached && now - cached.time < 86_400_000)
      return { value: cached.value, stale: false };
    if (this.pending.has(key)) return this.pending.get(key)!;
    const task = Promise.resolve().then(async () => {
      try {
        if (now - this.minute >= 60_000) {
          this.minute = now;
          this.count = 0;
        }
        if (
          now < this.blockedUntil ||
          this.count >= limit ||
          this.pending.size >= 3
        )
          throw new ProviderError(
            "The free data allowance is busy. Please try again shortly.",
            429,
          );
        this.count++;
        const response = await this.fetcher(url, {
          headers,
          signal: AbortSignal.timeout(12_000),
        });
        if (response.status === 429) {
          this.blockedUntil = now + 60_000;
          throw new ProviderError(
            "The provider quota is temporarily exhausted.",
            429,
          );
        }
        if (!response.ok)
          throw new ProviderError("The player provider is unavailable.");
        const raw = await response.text();
        if (raw.length > 4_000_000)
          throw new ProviderError("The provider response was too large.");
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw new ProviderError(
            "The provider returned an unexpected response.",
          );
        // Only cache successful envelopes. Unknown response shapes must not look like empty results.
        const envelope = value as Record<string, unknown>;
        const fields = [
          "player",
          "players",
          "allPlayers",
          "results",
          "teams",
        ].filter((k) => k in envelope);
        if (
          !fields.length ||
          fields.some(
            (k) => envelope[k] !== null && !Array.isArray(envelope[k]),
          )
        )
          throw new ProviderError(
            "The provider returned an unsupported response.",
          );
        if (this.entries.size >= 150)
          this.entries.delete(this.entries.keys().next().value!);
        this.entries.set(key, { value, time: now });
        return { value, stale: false };
      } catch (error) {
        if (cached && now - cached.time < 7 * 86_400_000)
          return { value: cached.value, stale: true };
        throw error instanceof ProviderError
          ? error
          : new ProviderError(
              "Could not reach the player provider. Please retry.",
            );
      } finally {
        this.pending.delete(key);
      }
    });
    this.pending.set(key, task);
    return task;
  }
}
const sportsCache = new ProviderCache(),
  rapidCache = new ProviderCache();
const sportsBase = "https://www.thesportsdb.com/api/v1/json/123/";
const text = z.string().trim().max(160).nullable().optional();
const sportsPlayer = z.object({
  idPlayer: z.string().regex(/^\d+$/),
  strPlayer: z.string().trim().min(1).max(160),
  strSport: text,
  strPosition: text,
  strTeam: text,
  strNationality: text,
  strStatus: text,
  strCutout: z.string().nullable().optional(),
  strThumb: z.string().nullable().optional(),
});
export function roleFrom(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const s = value.toLowerCase();
  if (/goal|keeper|^gk$/.test(s)) return "GK";
  if (/mid|^cm$|^dm$|^am$/.test(s)) return "MID";
  if (/def|back|^cb$|^lb$|^rb$/.test(s)) return "DEF";
  if (/forward|striker|wing|attack|^fwd$|^fw$/.test(s)) return "FWD";
  return null;
}
export function normalizeSports(
  raw: unknown,
  fetchedAt: string,
): Player | null {
  const result = sportsPlayer.safeParse(raw);
  if (!result.success) return null;
  const p = result.data;
  if (
    p.strSport !== "Soccer" ||
    /coach|manager|retired/i.test(`${p.strPosition || ""} ${p.strStatus || ""}`)
  )
    return null;
  const role = roleFrom(p.strPosition);
  // The API's artwork flag is not an image-specific licence. Use the designed
  // initials avatar until a source, creator and licence have been verified.
  return PlayerSchema.parse({
    id: `sportsdb:${p.idPlayer}`,
    provider: "sportsdb",
    providerId: p.idPlayer,
    name: p.strPlayer,
    role,
    club: p.strTeam || null,
    nationality: p.strNationality || null,
    image: null,
    fetchedAt,
    game: gameAttributes(role),
  });
}
const records = new Map<string, Player>();
function remember(players: Player[]) {
  for (const p of players) {
    if (records.size >= 2000) records.delete(records.keys().next().value!);
    records.set(p.id, p);
  }
}
function arrayField(value: unknown, keys: string[]): unknown[] {
  const obj = value as Record<string, unknown>;
  for (const k of keys)
    if (k in obj) {
      if (obj[k] === null) return [];
      if (Array.isArray(obj[k])) return obj[k];
      throw new ProviderError("Malformed player data from provider.");
    }
  throw new ProviderError("Unsupported player data from provider.");
}
const stamped = new WeakMap<object, string>();
function fetchedAt(value: unknown) {
  const obj = value as object;
  let time = stamped.get(obj);
  if (!time) {
    time = new Date().toISOString();
    stamped.set(obj, time);
  }
  return time;
}
async function sports(endpoint: string) {
  return sportsCache.get(endpoint, sportsBase + endpoint);
}
export async function discover(query: string): Promise<{
  players: Player[];
  stale: boolean;
  source: string;
  message: string;
}> {
  // The existing provider remains opt-in until its free subscription and payload are verified.
  if (process.env.PLAYER_PROVIDER === "rapidapi") {
    if (!process.env.RAPIDAPI_KEY)
      throw new ProviderError(
        "RapidAPI is selected but its server key is not configured.",
      );
    if (!query)
      return {
        players: [],
        stale: false,
        source: "RapidAPI",
        message:
          "Search by player name. This provider does not offer a verified browse feed.",
      };
    const host = "free-api-live-football-data.p.rapidapi.com";
    const response = await rapidCache.get(
      query,
      `https://${host}/football-players-search?search=${encodeURIComponent(query)}`,
      { "x-rapidapi-key": process.env.RAPIDAPI_KEY, "x-rapidapi-host": host },
      10,
    );
    const raw = arrayField(response.value, [
      "players",
      "allPlayers",
      "results",
    ]);
    const schema = z.object({
      id: z.union([z.string(), z.number()]),
      name: z.string().min(1).max(160),
      position: text,
      team: z.union([text, z.object({ name: text })]),
      nationality: text,
    });
    const players = raw
      .map((v) => {
        const p = schema.safeParse(v);
        if (!p.success) return null;
        const d = p.data;
        const role = roleFrom(d.position);
        return PlayerSchema.parse({
          id: `rapidapi:${d.id}`,
          provider: "rapidapi",
          providerId: String(d.id),
          name: d.name,
          role,
          club:
            typeof d.team === "object" ? d.team?.name || null : d.team || null,
          nationality: d.nationality || null,
          image: null,
          fetchedAt: fetchedAt(response.value),
          game: gameAttributes(role),
        });
      })
      .filter((p): p is Player => !!p);
    if (raw.length && !players.length)
      throw new ProviderError(
        "RapidAPI returned records that do not match its verified player contract.",
      );
    remember(players);
    return {
      players,
      stale: response.stale,
      source: "RapidAPI",
      message:
        "Provider search results. Coverage depends on your free subscription.",
    };
  }
  if (query) {
    const result = await sports(
      `searchplayers.php?p=${encodeURIComponent(query)}`,
    );
    const raw = arrayField(result.value, ["player"]);
    const players = raw
      .map((p) => normalizeSports(p, fetchedAt(result.value)))
      .filter((p): p is Player => !!p);
    if (raw.length && !players.length)
      throw new ProviderError(
        "No usable football profiles were supplied for this search.",
      );
    remember(players);
    return {
      players,
      stale: result.stale,
      source: "TheSportsDB",
      message:
        "Free player search returns at most one provider match. Search a full name for best results.",
    };
  }
  const teams = await sports("search_all_teams.php?l=English_Premier_League");
  const teamIds = arrayField(teams.value, ["teams"])
    .map((t) => z.object({ idTeam: z.string().regex(/^\d+$/) }).safeParse(t))
    .filter((t) => t.success)
    .map((t) => t.data!.idTeam)
    .slice(0, 3);
  if (!teamIds.length)
    throw new ProviderError("No teams were available from the free provider.");
  const players: Player[] = [];
  let stale = teams.stale;
  // Sequential calls avoid bursting the shared free allowance.
  for (const id of teamIds) {
    const result = await sports(`lookup_all_players.php?id=${id}`);
    stale ||= result.stale;
    const raw = arrayField(result.value, ["player", "players"]);
    players.push(
      ...raw
        .map((p) => normalizeSports(p, fetchedAt(result.value)))
        .filter((p): p is Player => !!p),
    );
  }
  const unique = [...new Map(players.map((p) => [p.id, p])).values()];
  remember(unique);
  return {
    players: unique,
    stale,
    source: "TheSportsDB",
    message:
      "Discovery sample: up to 10 players from each of 3 provider-listed English clubs. Not a complete league catalog.",
  };
}
export async function lookup(
  id: string,
): Promise<{ player: Player; stale: boolean }> {
  if (id.startsWith("sportsdb:")) {
    const rawId = id.slice(9);
    if (!/^\d+$/.test(rawId))
      throw new ProviderError("Invalid player ID.", 400);
    const result = await sports(`lookupplayer.php?id=${rawId}`);
    const players = arrayField(result.value, ["players", "player"])
      .map((p) => normalizeSports(p, fetchedAt(result.value)))
      .filter((p): p is Player => !!p);
    const player = players.find((p) => p.id === id);
    if (!player)
      throw new ProviderError("This player is no longer available.", 404);
    remember([player]);
    return { player, stale: result.stale };
  }
  const player = records.get(id);
  if (player)
    return {
      player,
      stale: Date.now() - Date.parse(player.fetchedAt) > 86_400_000,
    };
  throw new ProviderError(
    "Search this player again to refresh their profile.",
    404,
  );
}
