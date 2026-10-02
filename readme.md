# Either Football or Soccer

Build a football squad, configure five formations, simulate a match, and inspect the results. Optional server-side Gemini and RapidAPI integrations add player lookup and generated analysis.

[Repository](https://github.com/ranaumarbilal31/Either-Football-or-Soccer) · [Existing deployment](https://either-football-or-soccer.onrender.com)

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env`. Open http://localhost:3000. No API credentials are required for the demo experience.

## Production

```sh
npm ci
npm run build
npm start
```

The server uses `PORT` (default 3000) and listens on all interfaces. `npm start` explicitly selects production mode. Client files are built into `dist/client`; the server bundle and source map stay outside the public directory. `npm run preview` starts the same full application, including its API.

For Render, use `npm ci && npm run build` as the build command, `npm start` as the start command, and `/api/health` as the health check. Install development dependencies during the build. Keep credentials in the hosting environment.

## Configuration

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Optional Google AI key for estimated player attributes and coaching reports. |
| `GEMINI_MODEL` | Model available to your account; defaults to `gemini-3.5-flash`. Check Google's model documentation before changing it. |
| `RAPIDAPI_KEY` | Optional key with access to the configured football provider. |
| `RAPIDAPI_HOST` | Defaults to `free-api-live-football-data.p.rapidapi.com`. |
| `PORT` | HTTP listen port; defaults to 3000. |
| `TRUST_PROXY` | Trusted reverse-proxy hop count; defaults to 0. Configure only to match your hosting network. |

Credentials never go into frontend variables. The application is public: it has no account authentication. API requests have payload validation, request size limits, browser origin checks, provider timeouts, and in-memory rate limits (30 per client and 300 globally per minute). These limits reset on restart and are per server instance. Use provider quotas and a shared gateway limiter for a larger public deployment.

## Data and simulation

- The bundled catalog is a static game dataset with generated attributes. Clubs, ratings, and form are not guaranteed to reflect today's football season.
- Live lookup is attempted only with a configured RapidAPI key. Demo results are labeled when lookup is unavailable.
- Gemini generates estimated game attributes, not verified Opta statistics. Baseline demo attributes are used when AI is unavailable or returns invalid data.
- Matches use a probabilistic simulation with positional penalties, chemistry, fatigue, shots, and passes. This is not a prediction service for real matches.
- Player rating contributions are hand-written heuristics, not Shapley/SHAP explanations of a trained model.
- Coaching reports fall back to a local rules-based report when Gemini is unavailable. Reports are requested when the coach tab is opened.

## Squad behavior

Drafted squads, tactics, budget, pricing weights, custom players, and slot assignments persist in browser storage. Invalid or unavailable storage falls back safely. Reset clears the squad; it does not erase unrelated browser data.

Autofill reserves budget for the remaining positions. Preset squads require sufficient budget. Player swaps retain natural roles so out-of-position penalties still apply. Goalkeepers remain in goal. Incomplete squads receive role-appropriate reserves during simulation.

Catalog pricing uses the same formula for built-in and imported players. Changing pricing weights changes catalog valuations; players already drafted retain their acquisition costs until released.

## Verification

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs strict TypeScript checks, unit/API tests, and the production build. Browser tests cover persistence, malformed storage, mobile layout, scouting imports, dialogs, instant simulation, live playback, and local coaching. Set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Edge browser. GitHub Actions runs these checks on pushes and pull requests.

## Main files

- `src/App.tsx`: drafting, budget, persistence, and screen navigation.
- `src/utils/squad.ts`: assignments and budget-aware autofill.
- `src/utils/chemistry.ts` and `positionalCoherence.ts`: squad chemistry and role compatibility.
- `src/utils/simulation.ts`: probabilistic match engine.
- `server.ts`: scouting, enrichment, coaching, and HTTP hosting.
- `server/validation.ts`: request validation and API limits.
- `REVIEW.md`: findings, fixes, verification, and remaining limitations from the repository review.

## License

See [LICENSE](LICENSE). Existing source-file license notices have been preserved.

Owner: [ranaumarbilal31](https://github.com/ranaumarbilal31). Collaborator: [zaid-mian](https://github.com/zaid-mian).
