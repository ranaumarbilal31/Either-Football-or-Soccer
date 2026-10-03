import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import { z } from "zod";
import { discover, lookup, ProviderError } from "./server/players";
import { Roles } from "./src/domain/model";
export const app = express();
const production = process.env.NODE_ENV === "production";
const hops = Number(process.env.TRUST_PROXY || 0);
if (!Number.isInteger(hops) || hops < 0 || hops > 3)
  throw new Error("Invalid TRUST_PROXY");
app.set("trust proxy", hops);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: production
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'"],
            imgSrc: [
              "'self'",
              "data:",
              "https://www.thesportsdb.com",
              "https://r2.thesportsdb.com",
            ],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: null,
          },
        }
      : false,
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use((_req, res, next) => {
  res.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  next();
});
app.get("/api/health", (_req, res) =>
  res.set("Cache-Control", "no-store").json({ status: "ok", version: 2 }),
);
const buckets = new Map<string, { count: number; reset: number }>();
let globalCount = 0;
let globalReset = 0;
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const origin =
    process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`;
  if (
    req.get("sec-fetch-site") === "cross-site" ||
    (req.get("origin") && req.get("origin") !== origin)
  )
    return res
      .status(403)
      .json({ error: "Cross-origin requests are not allowed." });
  const now = Date.now();
  if (now > globalReset) {
    globalCount = 0;
    globalReset = now + 60_000;
  }
  for (const [key, value] of buckets)
    if (value.reset <= now) buckets.delete(key);
  const key = req.ip || "unknown";
  const bucket = buckets.get(key) || { count: 0, reset: now + 60_000 };
  if (
    bucket.count >= 60 ||
    globalCount >= 300 ||
    (!buckets.has(key) && buckets.size >= 2000)
  )
    return res
      .status(429)
      .set("Retry-After", "60")
      .json({ error: "Too many requests. Please try again in a minute." });
  bucket.count++;
  globalCount++;
  buckets.set(key, bucket);
  next();
});
const querySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(100).default(1),
    role: z.enum(["ALL", ...Roles]).default("ALL"),
    sort: z.enum(["name", "rating", "cost"]).default("name"),
  })
  .strict();
app.get("/api/v1/data-status", (_req, res) =>
  res.json({
    provider:
      process.env.PLAYER_PROVIDER === "rapidapi" ? "RapidAPI" : "TheSportsDB",
    freeOnly: true,
    refreshHours: 24,
    coverage:
      process.env.PLAYER_PROVIDER === "rapidapi"
        ? "Name search only; entitlement must be verified."
        : "Limited discovery sample; name search returns up to one player.",
    ratings: "Positional game estimates, not official player ratings.",
  }),
);
app.get("/api/v1/players", async (req, res, next) => {
  try {
    const query = querySchema.safeParse(req.query);
    if (!query.success)
      return res
        .status(400)
        .json({ error: "Invalid player search or pagination." });
    const { q, page, role, sort } = query.data;
    const data = await discover(q);
    const filtered = data.players
      .filter((p) => role === "ALL" || p.role === role)
      .sort((a, b) =>
        sort === "rating"
          ? b.game.overall - a.game.overall || a.name.localeCompare(b.name)
          : sort === "cost"
            ? a.game.cost - b.game.cost || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name),
      );
    const pages = Math.max(1, Math.ceil(filtered.length / 20));
    const current = Math.min(page, pages);
    res.json({
      ...data,
      players: filtered.slice((current - 1) * 20, current * 20),
      total: filtered.length,
      page: current,
      pages,
    });
  } catch (error) {
    next(error);
  }
});
app.get("/api/v1/players/:id", async (req, res, next) => {
  try {
    if (!/^(sportsdb|rapidapi):[a-zA-Z0-9_-]{1,80}$/.test(req.params.id))
      return res.status(400).json({ error: "Invalid player identity." });
    res.json(await lookup(req.params.id));
  } catch (error) {
    next(error);
  }
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
const errors: express.ErrorRequestHandler = (error, _req, res, _next) => {
  const status =
    error instanceof ProviderError
      ? error.status
      : error.status === 404
        ? 404
        : 500;
  res
    .status(status)
    .json({
      error:
        error instanceof ProviderError
          ? error.message
          : status === 404
            ? "File not found."
            : "An unexpected server error occurred.",
    });
};
app.use(errors);
export async function setupExpress() {
  if (!production) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const root = path.join(process.cwd(), "dist", "client");
    if (!existsSync(path.join(root, "index.html")))
      throw new Error("Run npm run build before starting production.");
    app.use(
      "/assets",
      express.static(path.join(root, "assets"), {
        maxAge: "1y",
        immutable: true,
        fallthrough: false,
        dotfiles: "deny",
      }),
    );
    app.use(
      express.static(root, {
        dotfiles: "deny",
        setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
      }),
    );
    app.get("*", (req, res) => {
      if (
        path.extname(req.path) ||
        req.path.split("/").some((s) => s.startsWith("."))
      )
        return res.status(404).end();
      res
        .set("Cache-Control", "no-cache")
        .sendFile(path.join(root, "index.html"));
    });
  }
  app.use(errors);
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT");
  const server = app.listen(port, "0.0.0.0", () =>
    console.log(`Football console listening on port ${port}`),
  );
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  return server;
}
