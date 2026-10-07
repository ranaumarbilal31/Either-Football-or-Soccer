import { RefreshJob } from "../src/game/types";
import { entrySchema, resultSchema, fplSchema } from "./catalog-v3";
type Dependencies = {
  read: (name: string) => unknown;
  write: (name: string, value: unknown) => Promise<void>;
  request: (url: string) => Promise<unknown>;
  rebuild: () => void;
  codes?: string[];
};
export function createRefreshService(deps: Dependencies) {
  const codes = deps.codes || [
    "PL",
    "ELC",
    "PD",
    "BL1",
    "SA",
    "FL1",
    "DED",
    "PPL",
    "BSA",
    "WC",
    "EC",
    "CL",
  ];
  const job: RefreshJob = {
    id: "",
    state: "idle",
    progress: 0,
    total: codes.length * 2 + 1,
    message: "Ready to refresh",
    errors: [],
    updatedAt: null,
  };
  let pending = Promise.resolve();
  const start = () => {
    if (job.state === "running") return job;
    Object.assign(job, {
      id: `refresh-${Date.now()}`,
      state: "running",
      progress: 0,
      message: "Refreshing players and results",
      errors: [],
    });
    pending = run();
    return job;
  };
  async function run() {
    let successes = 0;
    const raw = deps.read("football-live.json") as {
      competitions?: unknown[];
    } | null;
    const saved = {
      competitions: Array.isArray(raw?.competitions) ? raw!.competitions : [],
    };
    const old = deps.read("football-results.json");
    const results: Record<string, unknown> =
      old && typeof old === "object" && !Array.isArray(old)
        ? (old as Record<string, unknown>)
        : {};
    try {
      for (const code of codes)
        for (const kind of ["teams", "matches"] as const) {
          job.message = `Updating ${code} ${kind === "teams" ? "players" : "results"}…`;
          try {
            const data = await deps.request(
              `/competitions/${code}/${kind}${kind === "matches" ? "?status=FINISHED" : ""}`,
            );
            if (kind === "teams") {
              const entry = entrySchema.parse({
                code,
                fetchedAt: new Date().toISOString(),
                data,
              });
              if (!entry.data.teams.length)
                throw new Error("Empty roster response");
              saved.competitions = [
                ...saved.competitions.filter(
                  (c) =>
                    !entrySchema.safeParse(c).success ||
                    (c as { code: string }).code !== code,
                ),
                entry,
              ];
              await deps.write("football-live.json", saved);
            } else {
              resultSchema.parse(data);
              results[code] = data;
              await deps.write("football-results.json", results);
            }
            successes++;
          } catch (e) {
            job.errors.push(
              `${code} ${kind}: ${e instanceof Error && !("issues" in e) ? e.message : "invalid or unavailable response"}`,
            );
          }
          job.progress++;
        }
      job.message = "Updating FPL statistics…";
      try {
        const data = (await deps.request("fpl")) as {
          elements?: unknown[];
          teams?: unknown[];
        };
        fplSchema.parse({ data });
        if (
          !Array.isArray(data.elements) ||
          !data.elements.length ||
          !Array.isArray(data.teams) ||
          !data.teams.length
        )
          throw new Error("Invalid FPL response");
        await deps.write("fpl-live.json", {
          fetchedAt: new Date().toISOString(),
          data,
        });
        successes++;
      } catch {
        job.errors.push("FPL unavailable; retained previous data.");
      }
      job.progress++;
      deps.rebuild();
      job.state = job.errors.length
        ? successes
          ? "partial"
          : "failed"
        : "complete";
      if (successes) job.updatedAt = new Date().toISOString();
      job.message = job.errors.length
        ? "Refresh finished with unavailable sources. Previous valid data was retained."
        : "Players, ratings and prices are up to date.";
    } catch {
      job.state = "failed";
      job.message =
        "Refresh could not finish. Previous valid data is retained.";
    }
  }
  return { job, start, finished: () => pending };
}
