# EFOS — build your club, then play

A rebuilt football management and simulation app with a clean setup flow, a pitch-first squad builder, and no sidebar or decorative numbering.

## Local preview

Use Node 22.13 or newer. Run `npm ci`, configure `.env` from `.env.example`, then `npm run build` and `npm start`. Open http://127.0.0.1:3000. Use `npm run dev` for development. Original CSVs and existing provider snapshots remain in the ignored `data/` directory.

`data/` and `.env` are ignored by Git. Keep the original provider script and private key there; the app reads saved responses and never executes that script. FOOTBALL_DATA_KEY is used only on the server. Do not push or deploy without explicit user approval.

## Club and squad

Get started opens setup. Skip starts an empty club at 100 points; Auto-select creates a legal eleven within budget. Easy provides 120 points, Medium 100, Hard 85, Very Hard 70; custom budgets range from 55–200. Difficulty changes purchasing power only.

Desktop keeps pitch and players together; mobile uses Pitch/Players views. The saved list contains 15 players per position group. Search covers the full catalog. Goalkeepers are locked to goal. Shared clubs, leagues, nationality and positional fit determine chemistry links. Complete your eleven before choosing a real club or international opponent.

A league adds Your FC as an extra club, schedules every opponent home and away, includes fair byes, and freezes its catalog and prices for the season. Every fixture uses the same symmetric, seeded game engine. Both teams receive match grades and season rankings.

## Ratings and real data

Ability and simulated performance are separate ratings out of 10. Season ability uses position-specific category weights and percentiles within the same position/competition, with sample shrinkage `minutes / (minutes + 900)`. Up to 25% comes from verified individual last-five appearance grades, weighted newest first. Missing data is not treated as zero. Price is `roundToHalf(clamp(3 + 0.22 * (rating - 3)^2, 3, 15))` points.

The selectable player database imports `players_data-2026_2027.csv` and `players_data_light-2026_2027.csv` into local SQLite at `data/players.sqlite`. Matching full/light rows merge without duplicating players; missing evidence stays missing. Position-specific season statistics drive the ratings. Football-data.org and FPL retain real opponent coverage and result-derived club strength. Cross-provider identity links require a unique normalized full name, club and matching birth evidence. Unverified identities stay separate.

Live search uses the configured RapidAPI football provider through the server. Unique name/club matches to a verified database player can be signed. Unmatched live profiles are shown as profile-only because the search response does not contain verified position or individual performance statistics. Requests are queued and briefly cached; quota failures leave the local database available.

The current refresh does not supply individual appearance grades. Their form remains unavailable unless verified normalized evidence is added. No additional statistics provider has been selected or purchased. The extension point is the ignored `data/player-evidence.json` file, which accepts canonical player IDs with minutes, metrics and appearances (date, fixture, grade, minutes), validated on load in `server/catalog-v3.ts`. Team playing style uses the explicit limited-data fallback because current sources lack sufficient tactical evidence.

Refresh runs as one server-side job, limited to eight football-data.org requests per minute. Concurrent requests share the job. Valid responses replace files atomically; invalid or unavailable sources retain previous data. The UI shows progress and partial failures. New prices apply outside league seasons; an over-budget squad must be adjusted before another match.

## Code and persistence

The frontend is native HTML, CSS and JavaScript: `index.html`, `src/app.js`, `src/view.js` and `src/style.css`. No React or UI framework remains. `src/game/` contains the shared JavaScript engines, contracts and validated IndexedDB storage. `server/` retains TypeScript for database import, normalization, refresh and server-only APIs. Vite builds the static frontend; fonts are bundled locally.

New saves use a separate efos-rebuilt database. Previous efos-console/localStorage saves remain untouched and exportable from Club settings. Invalid saves are archived, and revision checks prevent silent overwrites by another tab.

Matches advance minute by minute. Managers can pause/resume, change speed, alter formation and issue tactical instructions. Halftime pauses automatically. Recorded events cannot be rewritten by later instructions. An optional fast-forward completes the same session, rather than rerolling a result. Both sides' scores, stats and performance grades derive from its events.

Optional Gemini analysis uses GEMINI_API_KEY with a locally verified default of `gemini-2.5-flash`; GEMINI_MODEL can override it. Gemini receives structured simulated facts and cannot alter scores. The local factual report always works without Gemini.

## Checks

`npm run check` runs type checks, unit tests, simulation calibration and a production build. `npm run test:e2e` runs isolated browser scenarios on localhost port 3100, primarily using synthetic fixtures. Install Playwright Chromium if needed.

Calibration uses five batches of 10,000 fixed seeds for equal teams, strength advantage, chemistry and positional damage. This is a game model, not a real-world prediction service. All release and hosting changes require a separate approval.
