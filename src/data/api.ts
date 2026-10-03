import { PageSchema, PlayerSchema } from "../domain/model";
export async function getJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  const json = await response.json();
  if (!response.ok)
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : "Player data is unavailable.",
    );
  return json;
}
export async function fetchPlayers(
  query: string,
  role: string,
  sort: string,
  page: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    q: query,
    role,
    sort,
    page: String(page),
  });
  return PageSchema.parse(await getJson(`/api/v1/players?${params}`, signal));
}
export async function fetchPlayer(id: string) {
  const data = await getJson(`/api/v1/players/${encodeURIComponent(id)}`);
  return PlayerSchema.parse(data.player);
}
