# Rebuild verification

The pre-rebuild implementation is preserved in local commit `ca66a57` for rollback. The rebuild replaces its giant dashboard, bundled player catalog, pricing UI, AI endpoints, localStorage state architecture and match engine.

## Implemented

- Dedicated Squad, Players, Match and Insights routes; persistent mobile navigation and a desktop sidebar.
- Paginated player discovery, preserved search/page/scroll position, detail dialogs, shortlist and comparison.
- New game schema, central squad validation, all five formations, locked acquisition costs and seeded simulation.
- Versioned IndexedDB autosave, multiple named clubs, revision-conflict detection, legacy migration and validated backups.
- Free provider-backed profiles, explicit coverage/freshness labels, bounded caching, throttling, upstream validation and no fabricated search fallback.
- Local fonts, navy/ivory/orange theme, original crest/favicon, initials avatars and responsive charts.
- Production CSP/security headers, source-file isolation, environment validation and graceful shutdown.

## Checked locally

- Strict TypeScript and production build pass.
- 15 domain/API/provider/persistence tests pass.
- Five browser scenarios pass: mobile navigation/details/comparison, full save/play/export/import, provider and malformed import errors, production security/responsive layout, and match playback.
- Responsive checks at 360, 390, 768 and 1440 pixels found no horizontal page overflow.
- Actual free-provider search, team-list and roster requests succeeded. The first discovery feed contained 28 playable/profile records after filtering staff.
- Default-provider images are excluded pending image-specific licence verification.
- Production dependency audit: zero known vulnerabilities at the verification time.

## Limits

- Free-provider coverage is a small discovery sample and limited name search, not a global current-season catalog. Profile fetch dates cannot guarantee the source's club-update date.
- The selected free profile endpoints do not supply sufficient validated performance statistics; OVR and attributes are positional baselines, visibly labeled. Players of the same role have the same baseline values.
- Existing Render environment has RapidAPI configuration, but the old public search endpoint returned authorization errors. The optional original adapter remains unverified and is not selected by default.
- No paid provider, paid hosting upgrade, account service or cloud-save database was introduced.
- Local automated browser tests use fixture responses; separate real-provider API checks establish availability, not universal data accuracy.
- Remote deployment and remote CI status must be checked after publishing; local test success does not establish either.
