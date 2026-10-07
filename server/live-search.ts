import { catalog } from "./catalog-v3";
import { normal } from "./player-db";
const TTL = 300000,
  LIMIT = 50;
const cache = new Map<string, { at: number; data: unknown }>();
let pending = Promise.resolve();
let lastRequest = 0;
function remember(query: string, data: unknown) {
  const now = Date.now();
  for (const [key, entry] of cache)
    if (now - entry.at >= TTL) cache.delete(key);
  while (cache.size >= LIMIT) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
  cache.set(query, { at: now, data });
}
export async function searchLive(query: string) {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) throw new Error("Enter at least two characters.");
  if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST)
    throw new Error(
      "Live search is not configured. Your player database is still available.",
    );
  const cached = cache.get(q.toLowerCase());
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  const task = pending.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastRequest));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/football-players-search?search=${encodeURIComponent(q)}`,
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
          "x-rapidapi-host": process.env.RAPIDAPI_HOST!,
        },
      },
    );
    if (response.status === 429)
      throw new Error(
        "Live provider quota reached. Search your database or retry later.",
      );
    if (!response.ok)
      throw new Error("Live search is temporarily unavailable.");
    const body = await response.json();
    if (body.status !== "success")
      throw new Error("The provider could not complete this search.");
    const c = catalog(),
      available = new Set(c.availableIds || c.players.map((p) => p.id));
    const players = c.players.filter((p) => available.has(p.id));
    const results = (
      Array.isArray(body.response?.suggestions) ? body.response.suggestions : []
    )
      .filter((p: any) => p.type === "player" && !p.isCoach)
      .slice(0, 30)
      .map((p: any) => {
        const matches = players.filter(
          (x) =>
            normal(x.name) === normal(String(p.name)) &&
            normal(x.club || "") === normal(String(p.teamName || "")),
        );
        return {
          providerId: String(p.id),
          name: String(p.name),
          club: String(p.teamName || ""),
          playerId: matches.length === 1 ? matches[0].id : null,
          verified: matches.length === 1,
        };
      });
    const data = { results, fetchedAt: new Date().toISOString() };
    remember(q.toLowerCase(), data);
    return data;
  });
  pending = task.then(
    () => {},
    () => {},
  );
  return task;
}
