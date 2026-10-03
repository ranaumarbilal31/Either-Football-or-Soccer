# Either Football or Soccer

A free football squad sandbox. Discover real player profiles, build an XI within a credit budget, set tactics, play a simulated match and use the report to improve your squad.

## Run

Node 22.12 or newer within the Node 22 release line is required. Render and CI use Node 22.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No paid subscription or API key is required for the default provider. Copy `.env.example` to `.env` for optional server configuration.

```sh
npm run check
npm run test:e2e
npm start
```

`check` runs TypeScript, domain/API/persistence tests and the production build. Browser tests require `npx playwright install chromium`, or set `PLAYWRIGHT_CHANNEL=msedge` to use Edge. `npm start` serves the production build and API together. The preview script uses the same production server. Use `npx prettier --write src server tests server.ts` to format changes.

## The console

- Squad: lineup, five formations, tactics, budget, named clubs, undo and backups.
- Players: paginated discovery, search, role filters, profiles, shortlist and two-player comparison. Mobile navigation always remains available. The catalog has no nested scrolling area.
- Match: three original training opponents, deterministic simulation, pause/speed controls and instant results.
- Insights: match statistics, individual ratings, local coaching, recent matches and an accessible OVR/cost chart.

React Router owns navigation, Zustand owns validated game state, TanStack Query owns remote queries and IndexedDB stores local progress. Pure domain modules own pricing, squad constraints and the seeded match engine. No AI service is called.

## Player data and its limits

Default: [TheSportsDB free v1 API](https://www.thesportsdb.com/documentation), using its documented public key. The discovery sample requests three provider-listed English clubs, with up to ten records per club. Coaches and retired records are excluded. Name searches are limited by the provider to one result. The UI never claims this is a complete league database.

Player identity and club come from the provider. Fetch dates show when the app retrieved data, not when a club transfer occurred. Provider data can be incomplete or outdated. Search failures never turn into fake players. Empty results stay empty. Previously discovered players remain available locally.

Successful responses are cached for 24 hours in a bounded server cache. During failures, the server can serve a marked stale entry for up to seven days. Provider calls are deduplicated, concurrency-limited and rate-limited. The default provider budget is 25 requests/minute per process, below its documented 30/minute allowance; shared-key limits may still apply. Caches reset on deployment. This app uses one Render instance; multi-instance deployment would require shared limiting and caching.

The provider's [terms](https://www.thesportsdb.com/docs_terms_of_use.php) allow endpoint content use subject to image and third-party rights. Because record artwork flags do not establish each image's licence, this release uses original initials avatars rather than unverified player images. The existing EFOS logo is retained.

`PLAYER_PROVIDER=rapidapi` retains an optional adapter for the original provider. It uses only the fixed original host and requires `RAPIDAPI_KEY`. It supports name search only. Its current subscription entitlement and payload have not been verified: the existing public site's search was authorization-protected. Do not enable it until its free entitlement and mapping pass integration checks. No paid fallback is configured.

## Game model

Profiles and estimated attributes are separate. Available supported attributes can feed the versioned formula; current free profile responses have no validated performance attributes, so version 1 uses explicitly labeled positional baselines. Players of the same natural role therefore share baseline ratings and costs. These are not official ratings or actual transfer values.

OVR is a positional weighted average of the six game attributes. Cost is `max(20, round(30 + (OVR - 50)^2 / 14))`. Acquired player prices are locked until release or replacement. Budgets range from 500–5,000 credits, with 1,000 by default. A squad cannot exceed its budget, duplicate a player or place a goalkeeper outfield.

Matches require all 11 slots. The seeded engine uses snapshot attributes, position fit, passing, pace, defense, keeper ability, tempo, line height and pressing fatigue. Score, shots, xG and passing totals derive from match events. Animated playback and instant results use the same simulation. Opponents are original training teams. Results are game simulations, not real-match predictions.

## Saves and recovery

IndexedDB holds schema version 2: up to 30 named squads, 2,000 discovered players, a shortlist and the latest 50 match snapshots. Autosaves use revisions and serialized writes. A competing browser tab pauses persistence with an export/reload notice instead of overwriting newer data.

Valid old localStorage squads, tactics, purchase prices and assignments are migrated once. Original keys are never deleted. Old identities remain `legacy:` records until the user chooses a provider replacement; name matching is never used to merge identities. Corrupt records are skipped during legacy recovery. Storage failures preserve an in-memory session with an export warning. Import/export uses validated JSON limited to 8 MB. Imports replace the active collection and can be undone.

## API and hosting

- `GET /api/health`: process health, independent of provider availability.
- `GET /api/v1/data-status`: provider and coverage information.
- `GET /api/v1/players?q=&role=ALL&sort=name&page=1`: up to 20 normalized records, total/pages, provider and stale status. Sort is `name`, `rating` or `cost`.
- `GET /api/v1/players/:providerIdentity`: refresh a supported profile.

Errors use `{ "error": "message" }`. Queries and upstream payloads are validated. Credentials remain server-only; fixed provider URLs prevent user-directed credential forwarding. Helmet headers, production CSP, same-origin checks, request throttling, timeouts and static-file isolation are enabled. This public sandbox has no accounts; origin checks and in-memory limits are not authentication.

Render configuration is in `render.yaml`: `npm ci --include=dev && npm run build`, `npm start`, and `/api/health`. Set `TRUST_PROXY=1` only for the known Render proxy and set `PUBLIC_ORIGIN` to the public HTTPS origin. `PLAYER_PROVIDER=sportsdb` is the free default. Free Render instances can sleep and take time to wake; no paid upgrade is required or performed.

## Licence

See [LICENSE](LICENSE). Original logo and repository licensing are retained. Player-source data has separate provider terms.
