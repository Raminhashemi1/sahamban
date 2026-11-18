# Sahamban Re-engineering Audit (Initial)

Date: 2026-11-18
Repository: Raminhashemi1/sahamban
Base branch: main
Working branch: codex/reengineering-audit

## Scope inspected

- `index.html` (67,984 characters): application shell, inline CSS, and script loading order.
- `app.js` (49,834 characters): core calculations, browser storage, chart rendering, market-data requests, and watchlist logic.
- `persian-ui.js`: Persian/Arabic digit normalization.
- `broker-import.js`: broker-file parsing and local portfolio import.
- `local-backup-v148.js`: local backup validation and restore/rollback.
- `technical-analysis-v50.js`: technical-analysis UI and event wiring.
- `technical-indicators-v50.js`, `decision-support-v129.js`, `external-screener-v130.js`, `temporal-holdout-v134.js`, `market-sample-v131.js`, and `fundamental-decision-gate-v150.js`: selected analytical modules.
- `sw.js` and `manifest.webmanifest`: PWA caching and install metadata.

This is a static source inspection only. No browser execution, live TSETMC/Codal request, financial-data validation, or end-to-end test has been run yet.

## Verified architectural observations

1. The app shell is a large single HTML document with substantial inline CSS and a long list of independently versioned script files.
2. The main `app.js` file is a 554-line browser script with direct DOM access, event registration, localStorage access, market networking, calculations, and presentation concerns combined in one file.
3. The page loads many feature modules as classic scripts. Their order and global/event contracts are therefore part of runtime behavior and must be preserved during refactoring.
4. `sw.js` maintains a manually curated precache list. It includes legacy assets and does not include `market-connectivity-test.html`, which is linked from the app shell. This may be intentional for a diagnostic-only page, but it needs an explicit offline policy.
5. The PWA cache strategy is network-first for same-origin GET requests, with cached fallback. Install uses `cache.addAll(CORE)`; a missing or failing core asset can reject the install event.
6. At the conventional paths checked, no `package.json`, `tests/app.test.js`, `test/app.test.js`, or `.github/workflows/ci.yml` was found. This does not prove there are no tests or workflows under other names/paths.

## Risks requiring deeper verification

- No automated test harness was found at the conventional locations checked. Financial calculations and import/restore logic need repeatable unit tests before any replacement.
- The app's large number of classic-script modules creates hidden coupling through globals, DOM IDs, custom events, and script order.
- The service-worker precache list is manually maintained and needs an automated consistency check against actual page assets.
- The app stores user data and a recorded audio data URL in localStorage. Quota behavior, data migration, and backup coverage need explicit tests; the backup module currently documents that recorded audio is excluded.
- Market-data freshness and cross-source quote/history matching are safety-critical. They must not be weakened during refactoring, and all source/date assumptions need deterministic fixtures.
- The initial calculator and market modules use direct DOM access. Missing or renamed DOM elements can cause startup-time failures unless initialization is guarded and tested.

## Safe re-engineering sequence

1. Inventory every referenced asset and module; verify every referenced file exists and identify orphaned/legacy assets.
2. Map public globals, custom events, storage keys, DOM IDs, and script dependencies.
3. Add a browser-independent test layer for pure financial calculations, Persian-number parsing, import validation, backup validation/rollback, freshness checks, and indicator calculations.
4. Fix correctness and security defects behind tests, without changing user-visible behavior unnecessarily.
5. Extract pure domain logic from DOM/network/storage code into explicit modules; retain compatibility adapters while migrating feature-by-feature.
6. Generate the service-worker precache list from a single asset manifest and test offline installation/update behavior.
7. Run browser smoke tests and regression tests before considering merge to `main`.

## Change policy

- Production files on `main` have not been modified.
- Work is isolated on `codex/reengineering-audit`.
- No financial decision logic should be replaced until its existing behavior and edge cases have tests.
- Do not merge or deploy until the user reviews the changes and the test evidence is available.
