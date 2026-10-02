# Repository review — 2026-10-02

Reviewed the checkout cloned from `ranaumarbilal31/Either-Football-or-Soccer`, starting at `d583301`. Changes are local and have not been pushed or deployed.

## Findings fixed

| Area | Original issue | Fix |
| --- | --- | --- |
| Persistence | A new session called `localStorage.clear()`, and the draft never restored its saved players. | Restore the squad and settings; never clear unrelated data. |
| Storage recovery | Invalid JSON or denied storage access could crash the app. | Validate saved values and recover with defaults. |
| Deployment | The server hard-coded port 3000; `npm start` did not select production mode. | Respect `PORT` and explicitly start the production server. |
| Public files | The server bundle and its source map shared the publicly served `dist` directory. | Serve only `dist/client`. |
| API protection | A secret embedded in browser code provided no authentication and broke requests when changed on the server. | Remove it; add bounded public API rate limits and browser origin checks. |
| API input | Partial match objects and invalid player input reached unsafe property accesses. | Validate nested match data and player fields; return JSON errors. |
| External requests | Provider requests had no deadline; invalid generated attributes could enter the catalog. | Add timeouts and validate generated player data before use. |
| Scouting | Demo results lacked IDs and all records could appear to be loading together. | Stable demo IDs and explicit live/demo source metadata. |
| Scouting imports | Duplicate imports could display a success toast despite being rejected. | Propagate the import result and keep the rejection visible. |
| Chemistry | The pitch and simulation used different chemistry formulas. | Use the same positional chemistry calculation throughout. |
| Position changes | Changing a deployed position overwrote the player's natural position. | Move/swap assignments while retaining the native role and penalties. |
| Formation changes | Sequential placement could consume another role's slot; GK restrictions were inconsistent. | Reconcile assignments with native roles first and preserve goalkeeper rules. |
| Budget | Greedy autofill could exhaust the budget before completing the XI; presets bypassed the budget. | Reserve budget for remaining roles, validate presets, and prevent lowering the budget below squad cost. |
| Pricing | Imported and built-in players used different price formulas. | Share one valuation function and active weights. Drafted prices remain acquisition costs. |
| Simulation | Every reserve was a midfielder; deployed roles did not consistently determine shooting/defense. | Fill missing formation roles and use deployed positions for those calculations. |
| Match statistics | Away misses/saves omitted xG; player pass totals disagreed with team totals; zero stats were replaced with invented values. | Preserve shot xG, aggregate actual simulated passes, and keep zero values. |
| Playback | Kickoff never appeared; stamina effects could apply repeatedly. | Include minute-zero events and derive stamina from elapsed match time. |
| Reports | Markdown markers appeared literally, and AI reports were fetched before the coach tab was opened. | Safely render supported Markdown as React elements and fetch on demand. |
| Data claims | UI described estimates as Opta feeds and hand-written rating contributions as Shapley values. | Label estimates, demo fallbacks, and heuristic rating contributions accurately. |
| UI | Mobile budget layout could overflow, catalog height made squad controls hard to reach, and cards started invisible. | Responsive sizing, shorter mobile catalog, visible cards, focus indicators, and keyboard-accessible scout dialogs. |
| Dependencies/checks | Audit reported seven vulnerabilities; React type packages and regression tests were absent. | Compatible dependency fixes, React types, strict TypeScript, unit/API tests, browser tests, and CI. |
| Setup | Missing environment example, Unix-only clean command, and outdated runtime guidance. | Add environment template, cross-platform scripts, and updated setup/deployment documentation. |

## Verification

- Strict TypeScript check: passes.
- Unit and API regression suite: 17 tests pass, covering all five formations, budget-aware autofill, stored-state recovery, shot/goal/xG/pass consistency, invalid requests, fallback APIs, origin checks, throttling, chart regression/scaling, and provider caching/budget limits.
- Production build: passes. React and animation libraries are split into cacheable chunks.
- Browser suite: four scenarios previously passed before the full UI redesign, covering drafting/persistence/instant-match/coaching, corrupted storage/mobile sizing/private server files, scouting import/duplicate handling/dialog dismissal, and live playback. Reverification of the redesigned UI is pending: browser automatic approval review blocked localhost inspection.
- Desktop coaching report and mobile layout visually inspected.
- Dependency audit: zero known vulnerabilities after compatible updates.
- GitHub Actions workflow added; its remote execution has not been observed.

## UI and hosting update

- Navy, ivory and orange theme replaces green accents. Monoton is locally hosted for major headings and the game name; Inter is used for interface text. Existing logo retained and used as favicon.
- Rebuilt rating/cost chart with responsive SVG axes, position filters, correctly scaled points, regression line, correlation, pointer inspection and an accessible exact-value selector.
- Added production security headers, same-origin request validation, bounded provider concurrency, request deduplication, five-minute caching and a configurable daily AI request cap. Provider quotas are still needed across restarts and replicas.
- Added Render configuration, production asset isolation, startup validation and graceful shutdown.
- Existing Render service was accessible and running original commit d583301. Logs inspected showed startup, not a crash. Current settings use `npm install; npm run build` and no health-check path; proposed replacements are `npm ci --include=dev && npm run build`, `npm start` and `/api/health`. These dashboard changes have not yet been applied.
- Render reports the existing free instance sleeps when inactive and can take 50 seconds or more to wake. No paid plan change was made.

## Limits and follow-up work

- No Gemini or RapidAPI credentials were supplied. Live paid-provider success, subscription entitlement, actual provider payloads, and quotas have not been verified. Demo/local paths were tested. Gemini's model is configurable; the existing `gemini-3.5-flash` identifier was found in Google's official [model documentation](https://ai.google.dev/gemini-api/docs/models).
- The bundled catalog and opposition profiles remain static game data. This review does not claim to update every club transfer, rating, or player statistic to the current season. A licensed, maintained data source would be needed for that.
- The match engine remains a game simulation, not an empirically calibrated real-match predictor. Away player-by-player ratings are not implemented; away team totals are simulated.
- Public API limits are in memory and per process. They are not account authentication, distributed abuse prevention, or a guarantee against provider costs. Configure provider quotas and hosting proxy settings for deployment.
- The browser suite was executed locally in Edge. CI is configured for Chromium on Node 22; other browsers and remote CI still need their own runs.
- Existing MIT repository license and Apache source headers were preserved; ownership/licensing reconciliation was not attempted.
- GitHub and the existing hosted application are unchanged until these local changes are reviewed and published.
