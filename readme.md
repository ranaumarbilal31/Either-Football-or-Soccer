<p align="center">
  <img src="public/logo.webp" alt="EFOS crest" width="96" />
</p>

<h1 align="center">Either Football or Soccer</h1>

<p align="center">Build your club. Find your chemistry. Take control on matchday.</p>

EFOS is a football squad builder and management simulation with real player data, a points-based transfer budget, and an interactive touchline. Pick your eleven, connect the right players, and test your approach against real clubs or national teams.

The frontend uses **plain HTML, CSS, and JavaScript**, with locally bundled Monoton headings and a responsive pitch-and-player workspace. Match outcomes come from a seeded game engine; optional Gemini analysis explains the result afterward.

## What you can do

- **Create your club:** choose a team name, manager, difficulty, and budget, or skip setup and start with an empty pitch.
- **Build an eleven:** search players, filter the database, assign players by click or drag-and-drop, and choose from five formations. Goalkeepers stay locked to goal.
- **Find chemistry:** see neighboring connections colored by shared club, league, nationality, and positional fit.
- **Manage the match:** pause, adjust tempo and pressing, change your defensive line or formation, and issue instructions at halftime.
- **Play a season:** join a supported domestic league as an extra club and face every opponent home and away.
- **Review performances:** inspect event-derived statistics, both teams' player grades, match reports, and season rankings.
- **Keep your progress:** save locally in your browser, export your game, and preserve previous-version saves in an archive.

## Run locally

**Requirements:** Node.js **22.13 or newer** and npm. Player CSVs and provider snapshots are local inputs; they are not included in this repository.

```sh
git clone https://github.com/ranaumarbilal31/Either-Football-or-Soccer.git
cd Either-Football-or-Soccer
npm ci
```

Copy `.env.example` to `.env`, then configure the integrations you want to use. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Place your player CSVs in `data/`:

```text
data/
  players_data-2026_2027.csv
  players_data_light-2026_2027.csv
```

The importer merges matching full/light records and creates `data/players.sqlite` automatically. Use the full file for the richest statistics; the light file supplies overlapping or supplementary fields. To populate or update provider-backed opponents, configure `FOOTBALL_DATA_KEY` and run:

```sh
npm run refresh:data
```

Start the production preview:

```sh
npm run build
npm start
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. For development with live reload, use `npm run dev`.

A fresh clone needs its own data or a successful provider refresh before meaningful squad building and opponent selection are available. The browser tests also include a scenario that requires the local CSV database.

## Configuration

All provider requests run on the server. Never put API keys in frontend code.

| Variable | Purpose |
| --- | --- |
| `HOST` | Preview address; defaults to `127.0.0.1` for local access. |
| `PORT` | Server port; defaults to `3000`. |
| `FOOTBALL_DATA_KEY` | Football-data.org squads, competitions, and results. |
| `RAPIDAPI_KEY` | Optional live player search. |
| `RAPIDAPI_HOST` | Live-search provider hostname, supplied in `.env.example`. |
| `GEMINI_API_KEY` | Optional post-match analysis. |
| `GEMINI_MODEL` | Optional model override; the implementation defaults to `gemini-2.5-flash`. |

`.env`, `data/`, generated builds, and test artifacts are ignored by Git. Original provider scripts are preserved as local inputs and are never executed by the application. The server blocks access to private data paths.

## Budgets and team building

| Difficulty | Starting points |
| --- | ---: |
| Easy | 120 |
| Medium | 100 |
| Hard | 85 |
| Very Hard | 70 |

Custom budgets range from **55–200 points**. Difficulty changes purchasing power, while match rules remain the same. Auto-select builds a legal eleven within the budget; an incomplete or over-budget squad cannot start a match.

Available formations are **4-3-3, 4-4-2, 4-2-3-1, 3-5-2, and 5-3-2**. The saved shortlist contains up to 15 players per position group: GK, DEF, MID, and FWD. Search covers the wider local database. Desktop shows the pitch and player selection together; mobile offers separate Pitch and Players views.

## Ratings, prices, and chemistry

**Player ability** and **match performance** are separate ratings, both out of 10.

Season ability compares available position-specific statistics with peers in the same competition. Small samples shrink toward the position average using `minutes / (minutes + 900)`. The role weights for prevention, distribution, and attack are:

| Position | Prevention | Distribution | Attack |
| --- | ---: | ---: | ---: |
| GK | 70% | 30% | 0% |
| DEF | 60% | 30% | 10% |
| MID | 20% | 55% | 25% |
| FWD | 10% | 25% | 65% |

Weights renormalize over available categories. Verified individual appearances can contribute up to 25% of ability, with the newest of the last five weighted most heavily. Missing evidence is excluded; insufficient evidence produces a clearly marked estimate.

```text
Price = roundToHalf(clamp(3 + 0.22 × (rating − 3)², 3, 15))
```

Neighboring chemistry links start at 20 points, with bonuses for the same real club (+45), league (+20), and nationality (+15), capped at 100. Positional fit reduces weaker connections. Green, yellow, orange, and red links also include text explanations.

The interface shows raw squad quality, chemistry, and effective strength separately:

```text
Chemistry = 60% average link score + 40% average positional fit
Effective strength = quality × positional fit × (0.65 + 0.35 × chemistry / 100)
```

## Matchday and league seasons

The same seeded engine runs both teams. It models passing, possession, chances, finishing, goalkeeper saves, fatigue, and tactical tradeoffs. Poor chemistry reduces coordinated play, while an attacker placed in defense directly weakens the defensive line.

Matches advance minute by minute. Instructions affect future play without rewriting recorded events. Halftime pauses automatically, and fast-forward completes the same session. Scores, shots, saves, assists, possession, and player grades come from the recorded events.

Opponents are selectable only when their real-player lineup is complete. League mode requires complete domestic-league coverage, adds your club as an extra team, handles byes, and simulates the other fixtures through the same engine. A season freezes its catalog and prices so a refresh cannot change competitive conditions midway through it.

Gemini receives structured match facts to write richer analysis. It does **not** choose the winner or change the score. The factual report remains available when Gemini is disabled or unavailable.

## Data coverage and current limits

- The local CSV database supplies season evidence; football-data.org and FPL provide additional squad, results, and statistics coverage.
- Live search can sign uniquely matched database players. Unmatched profiles remain profile-only when verified position data is unavailable.
- Individual last-five appearance grades are not supplied by the current CSVs or live-search response. Form stays unavailable unless verified evidence is added to `data/player-evidence.json`.
- Cross-provider identities merge only when the required matching evidence is unique; ambiguous records stay separate.
- Playing style uses a limited-data fallback when tactical statistics are insufficient.
- Provider refreshes are queued and rate-limited. Partial failures retain the last valid data, and price changes outside an active season may require budget adjustments.

EFOS is a football game model, not a real-world result prediction service. Provider availability and quotas determine live coverage.

## Project structure

```text
index.html          Native frontend entry
src/app.js          Screens, navigation, and match controls
src/view.js         Pitch and reusable HTML rendering
src/style.css       Responsive styling and local fonts
src/game/           Shared ratings, chemistry, simulation, leagues, and saves
server/             CSV import, SQLite, provider adapters, and local APIs
scripts/            Development and data-refresh tooling
tests/              Domain, storage, provider, and browser checks
public/             Circular crest and favicon
data/               Private local inputs and database; ignored by Git
```

The backend uses Express and TypeScript. Vite builds the static frontend, and the game engines are shared JavaScript modules with type declarations. Browser progress uses validated IndexedDB storage with revision checks to prevent silent cross-tab overwrites.

## Verification

```sh
npm run check          # Type checks, unit tests, calibration, and production build
npx playwright install chromium
npm run test:e2e       # Browser scenarios on localhost port 3100
```

The engine calibration runs five batches of 10,000 fixed seeds to check equal-team symmetry, strength advantage, chemistry penalties, and positional damage. Browser coverage includes setup, persistence, search, budget accounting, goalkeeper locks, responsive layouts, league play, and interactive match controls.

## License

[MIT](LICENSE) · Created by [ranaumarbilal31](https://github.com/ranaumarbilal31).
