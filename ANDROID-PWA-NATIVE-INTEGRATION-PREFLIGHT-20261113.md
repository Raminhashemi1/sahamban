# Day 4 Android ↔ PWA native backup integration preflight — 2026-11-13

## Authority and scope
Read-only branch-asset comparison and **new deterministic, synthetic JS integration regression** in PR [#166](https://github.com/Raminhashemi1/sahamban/pull/166), branch `feta`, against pre-change HEAD `10bb147873ccafd9a4bf688a62270d2e5d2634e3`. This is within the original Day 4 mobile/security scope; it **does not deploy, merge, build a signed APK, change financial decisions, touch user holdings or certify end-to-end Android acceptance**. Dedicated TalkBack/VoiceOver work remains outside the current scope by explicit owner decision (recorded in preceding `PROJECT-MEMORY.md` entries).

## Exact GitHub asset mismatch, verified before changes

| Component | Public `main` at `a5c10548904ee0e1cd80169729071d0bb390f606` | Unmerged `feta` at `10bb147873ccafd9a4bf688a62270d2e5d2634e3` |
| --- | --- | --- |
| `index.html` | Blob `c7d0c068280d6f78adb4586f5fa6a769d960efeb`; no native-backup helper script | Blob `89561947babf43c982b55e03ce7bfe7f90e8c768`; loads `./native-backup-export-v1.js?v=1.0` ahead of other app modules |
| `sw.js` | Blob `2d58ba89fcea8472534f6e57aca1ef5bca8425b4`; no cached native helper | Blob `bac298aeb48d21b2cf6104cf67bd6b2780312b57`; native helper included in core asset cache |
| `native-backup-export-v1.js` | **Not present** in `main` (GitHub contents returned NOT_FOUND) | Blob `ceb0e6f92a9a0e486ebe121b0ec47c0054f13291` |
| `local-backup-v148.js` | Blob `09736156b9860a76944754126b262f9a54fd39a6`; not wired to new helper | Blob `574538bc5fbc1149285ca49be05dc2a51d0913ea`; delegates to native helper and reports unencrypted JSON |
| `app.js` risk JSON handler | Blob `a0d4d94d82040322b7bda2959d4f19479b657a39`; no native helper delegation | Blob `452997421acdcfea38bec794ce9de307418aa2af`; uses helper and matching 256 KiB restore cap |

Android `MainActivity.java` still loads `https://raminhashemi1.github.io/sahamban/` (the **published `main` Pages site**) and `BackupExportPolicy.java` only permits main-frame origin `https://raminhashemi1.github.io` plus `TrustedNavigation.isInternal(view.getUrl())`. A preview at a different host is **not** a drop-in substitute; origin-scoping must never be weakened just to get a PASS. Static GitHub branch-file comparison does not independently verify the site's currently served cache/runtime.

## Existing regression coverage: DO NOT repeat
Prior `tests/native-backup-export-v1.test.cjs` validates native protocol, request ID, blob-fallback failures, timeout and bytes; `tests/local-backup-v148.test.cjs` validates snapshot allowlist, preview/consent, rollback and standalone module loading; `tests/android-backup-self-test.test.cjs` and Java `BackupFileVerifierTest` validate the separate debug fixture/SAF behavior. On pre-change SHA `10bb147873ccafd9a4bf688a62270d2e5d2634e3`, **13/13 check runs** and **12/12 matching-head workflow runs** completed/success. Historical physical synthetic local, risk, Cancel and user-attested airplane-mode passes are already recorded, not repeated.

## New non-duplicate coverage
Added one test **to existing `tests/local-backup-v148.test.cjs`** (already invoked in `.github/workflows/smoke-tests.yml`, no workflow edit): mount the **real** local PWA button handler; create allowlisted **synthetic** alert/watchlist state; pass it through the **real** `native-backup-export-v1.js` client into a simulated origin-scoped Android `WebMessage` response; ensure no success before the request-ID-correlated native reply, ignore forged correlation, verify non-allowlisted state never exports, confirm save does not mutate storage, then reselect and validate the JSON and verify that only explicit restore consent mutates the allowed destination keys. Verify cancellation does not claim save or change local state.

This is a **module-level JS integration simulation only**. The mocked `saved` reply is *not* a native Android file-system write; the Java implementation and actual device/provider path remain distinct. The new CI should be checked **on its resulting exact SHA** before classifying this synthetic integration test as passing.

## Next non-duplicative real-world dependency
**`REAL_PWA_BACKUP_UNVERIFIED`** until an explicitly authorized, **origin-correct** controlled environment serves the entire matching PWA bundle and the physical Android main launcher saves and restores a synthetic snapshot (without transferring Chrome/PWA's private storage or destroying existing portfolios). Do **not** independently publish `feta` to public GitHub Pages, alter `main`, bypass origin guards, or call a debug-only synthetic PASS a release signoff. Leave PR #166 Draft, Issue #167 OPEN, `MARKET_RELEASE_BLOCKED`.

## 2026-11-13 follow-up — Android SAF import policy correction
Review of the actual production `MainActivity` uncovered that the file chooser returned a SAF URI to the PWA's `<input type=file>` while WebView content access was disabled. The same chooser accepted `*/*` and could forward up to ten URIs without scheme checks. This was a concrete restore-path defect not covered by the synthetic fixture (which already enabled content access).

The current branch corrects this narrowly: `content://` access is enabled for WebView, but `file://` remains disabled; the chooser requests JSON and a read-only transient grant; the Activity requires the returned read-grant flag and forwards only one URI accepted by `BackupImportPolicy`. Pure-Java tests cover content provider URIs and reject file/network/malformed inputs. This does not grant persistent access and does not itself establish physical restore PASS. The exact new SHA and Android CI must be checked before claiming the correction is green.
