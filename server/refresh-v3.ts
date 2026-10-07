import fs from "node:fs/promises";
import path from "node:path";
import { readData, catalog } from "./catalog-v3";
import { createRefreshService } from "./refresh-service";
const root = path.resolve("data");
let requests = 0,
  windowAt = Date.now(),
  quotaUntil = 0;
export async function atomicWrite(name: string, value: unknown) {
  await fs.mkdir(root, { recursive: true });
  const target = path.join(root, name),
    temp = target + ".tmp";
  await fs.writeFile(temp, JSON.stringify(value));
  await fs.rename(temp, target);
}
async function request(endpoint: string) {
  const fantasy = endpoint === "fpl";
  if (!fantasy) {
    if (Date.now() < quotaUntil)
      throw new Error(
        "Provider quota reached; retry after the allowance resets.",
      );
    if (Date.now() - windowAt >= 61000) {
      windowAt = Date.now();
      requests = 0;
    }
    if (requests >= 8) {
      service.job.message = "Waiting for the provider request allowance…";
      await new Promise((r) =>
        setTimeout(r, Math.max(0, 61000 - (Date.now() - windowAt))),
      );
      windowAt = Date.now();
      requests = 0;
    }
    requests++;
  }
  const response = await fetch(
    fantasy
      ? "https://fantasy.premierleague.com/api/bootstrap-static/"
      : "https://api.football-data.org/v4" + endpoint,
    {
      headers: fantasy
        ? {}
        : { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY! },
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!response.ok) {
    if (!fantasy && response.status === 429)
      quotaUntil =
        Date.now() +
        Math.max(60, Number(response.headers.get("retry-after")) || 60) * 1000;
    throw new Error(
      `Provider returned ${response.status}${response.status === 429 ? " (quota reached)" : ""}`,
    );
  }
  return response.json();
}
const service = createRefreshService({
  read: readData,
  write: atomicWrite,
  request,
  rebuild: () => {
    catalog();
  },
});
export const job = service.job;
export const refreshFinished = service.finished;
export function beginRefresh() {
  if (!process.env.FOOTBALL_DATA_KEY)
    throw new Error("Add FOOTBALL_DATA_KEY to the server environment first.");
  return service.start();
}
