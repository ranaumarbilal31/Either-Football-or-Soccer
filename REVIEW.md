# Rebuild review

The previous dashboard, sidebar, pages, state store, rating engine, simulation and obsolete provider adapters have been replaced. The repository, original logo, private data and previous browser saves remain intact.

The new experience starts empty, supports skip/automatic setup, uses a 100-point default budget, and places pitch beside player search. Shared ratings and chemistry power prices, opponent previews and every fixture. League seasons add the user's club and freeze data.

The frontend now uses plain HTML, CSS and JavaScript. React, its dependencies and the old UI files have been removed. Monoton is bundled locally for all headings, including the highlighted home text. The requested slogans and shared data footer have been removed; the circular favicon and SVG background remain. Desktop pitch and player selection panels have more room without clipping the goalkeeper.

The two user CSVs merge into a local SQLite player database with 2,071 unique players. Its 60-player shortlist contains 15 per position group, with the wider database available through search. Live search and Gemini generation were both verified through the localhost server; credentials remain private. Gemini defaults to the verified gemini-2.5-flash model.

Limitations: verified individual last-five form is not present in these CSVs or the live-search response. Unmatched live profiles lack position evidence and cannot be signed. Unsupported abilities remain labelled estimates, and opponent playing styles use a limited-data fallback.

The match screen supports minute-by-minute play, pause/resume, speed, halftime, tactical instructions and formation changes. Later instructions affect future events, never the recorded past. Fast-forward uses the same session. Both teams receive event-derived statistics and player grades.

Checks cover budgets, positions, identity matching, refresh failures, save conflicts, league scheduling, frozen data and both-team grades. Five 10,000-seed batches verified calibration: the stronger 90-versus-60 team won 86.93%, with 393 upsets. Equal-team wins were 3,700 versus 3,783. Moving forwards into defense increased conceded goals from 8,799 to 11,922 in the positional comparison.

## Review pass

A follow-up review fixed one silent data-loss bug and one hot-path performance defect, then removed the scaffolding the migration left behind.

Progress used to stop saving after 50 matches. The app trimmed its match history to 100 while the save validator accepted at most 50, so once the array crossed 50 every save threw, was swallowed into the storage notice, and the game could no longer persist. A single `matchLimit` in `src/game/types.js` now feeds both the trim in `src/app.js` and the schema in `src/game/validation.js`, and a regression test pins the two together.

`catalog()` rebuilt the whole merged catalog on every request, including a SQLite read, roughly 2,000 JSON parses and an O(n²) identity scan, and live search called it again on every query. Both the merged catalog and the loaded player list are now memoized on the provider revision and CSV mtimes that also drive refresh invalidation. The live-search cache is capped and pruned instead of growing without bound.

Removed: the unused `StatisticsProvider` interface, the unused `seeded` and `edges` exports (both functions kept as internals), the file-local `roleFrom` and `appearanceSchema` exports, a duplicated `normal()` helper, a no-op club alias, an unreachable branch in `playView()`, an unused `emptySquad` import, an unread `PLAYER_PROVIDER` test setting, a duplicated screenshot call, the unused `prettier` dependency, four unused `tsconfig.json` flags, and dead or byte-identical CSS rules. The match report's performance list no longer carries a numbered rank badge, per the project rule against decorative numbering.

No commit, push or deployment was made. Review the localhost preview before approving a release.

After this pass, `npm run lint`, all 15 automated tests and the production build pass, including the fifteenth test covering the match-history limit and the five 10,000-seed simulation batches. The 14 browser scenarios in `npm run test:e2e` have not been re-run since the pass.
