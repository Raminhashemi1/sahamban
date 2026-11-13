# Day 4 isolated security regression — 2026-11-13 closeout checkpoint

## Confirmed baseline and source audit
- Existing Draft [PR #168](https://github.com/Raminhashemi1/sahamban/pull/168) tested the original four `tests/day4-public-subscription-boundary.test.cjs` scenarios successfully on SHA `45426f4b923fa1c56f31b1f135b87db9b9405e93`. Its [Smoke workflow #43482222334](https://github.com/Raminhashemi1/sahamban/actions/runs/43482222334) completed successfully; its smoke job #132081329845 explicitly shows `Run node --test tests/day4-public-subscription-boundary.test.cjs` completed SUCCESS. All 11 matching PR workflows at that **baseline SHA** were completed/success.
- The main working branch PR #164 already added a narrow regression fix in commit `3e6063b44d7f2530629bd92da7c4e92d904c33f6`. Its source includes 57 HTML-loaded scripts and **one additional Service Worker-only `portfolio-pilot-v51.js`**, for a deduplicated total of 58 first-party scripts. That file was read at the immutable main-work SHA and had no direct prohibited `SERVER_MODULE_IMPORT` match; this is a limited static source observation, not complete Node CI.
- The identical **test file content** (blob `20795d5c6d2b0f74eec9d09656ecbfd1e09cc456`) was updated on this **existing isolated branch only** in commit `d77dcc60b6abcf9a3857582b710ded4037939923`. The four test scenarios remain; the import scan now checks `new Set([...publicScripts,...cachedScripts])` so Service Worker-only JavaScript cannot silently escape the server-import guard. No production app, WebView, service worker, payment business logic, or workflow code changed.
- At the first exact-SHA recheck for `d77dcc60...`, GitHub returned **zero matching PR workflows and zero combined status records**; therefore `DAY4_ISOLATED_58_SCRIPT_CI=UNVERIFIED`. Do not transfer the baseline green result to the new SHA.

## Acceptance boundaries
- PR #168 is OPEN/Draft/unmerged; PR #164 and separate Android PR #166 remain unmerged. This change is **test-only**; no cherry-pick or merge into main.
- `DAY4_FULL_ACCEPTANCE=false`, `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`. Day 3 limited engineering is complete only under DEC-008; `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`.
- Do not repeat already documented physical Samsung synthetic Save/preview tests or request a real holdings restore. No Merge, Deploy, publication, billing, trade, order, holdings mutation, or signal activation was performed. Original five-day plan unchanged.

## Single next step
Inspect the GitHub Actions Smoke job for **this branch's new HEAD after this checkpoint commit**, confirming the 58-script `node --test tests/day4-public-subscription-boundary.test.cjs` step actually finished successfully. If there is no exact-SHA run, mark CI UNVERIFIED and request an owner-run workflow_dispatch; do not claim automatic completion or production release.
