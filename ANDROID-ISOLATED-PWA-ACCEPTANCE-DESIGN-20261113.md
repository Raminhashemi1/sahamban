# Isolated Android ↔ real PWA acceptance design — 2026-11-13

## Decision
**Design only. Not implemented, built, installed, or executed. Owner approval is required before any implementation or device operation.**

Objective: test the actual feta PWA asset bundle with the existing exact-origin Android SAF bridge, without publishing it to GitHub Pages, relaxing origin policy, or reading/writing the owner's existing Chrome/PWA/WebView profile.

## Current evidence and blockers
- PR #166 is the only Android implementation branch (feta); keep it separate from PR #164.
- MainActivity loads the published https://raminhashemi1.github.io/sahamban/ page. Public main does not load/cache native-backup-export-v1.js; matching helper and HTML/service-worker wiring are only on unmerged feta.
- TrustedNavigation, BackupExportPolicy and BackupExportBridge enforce the exact HTTPS GitHub Pages origin/path. A preview host or alternate origin is not an acceptable shortcut.
- A normal Android PWA synthetic import-preview screenshot proves preview only, not native export, confirmed restore, or full round-trip.
- Existing offline debug SAF nonce/readback PASS and JS mocked-WebMessage integration tests are separate evidence and must not be repeated or relabeled as full PWA integration.

## Proposed isolated harness (no production site change)
1. **Separate debug-only package identity.** Add a dedicated debug acceptance variant/application ID suffix (for example, .acceptance) distinct from existing pilot and .retest/.restore packages. It must install side-by-side and use its own Android app sandbox/WebView data directory. Never update/uninstall the user's existing pilot, Chrome or installed PWA.
2. **Pin the exact web bundle.** Stage required PWA files from one recorded feta commit SHA into debug-only Android assets. Generate a manifest containing every requested local path, source blob SHA-256, byte length and expected MIME type. Fail build/test if any referenced first-party script, stylesheet, icon, worker, JSON fixture or module is absent or mismatched. No user content or production secrets.
3. **Preserve the real origin without remote hosting.** Load staged index.html in the isolated WebView using the exact approved HTTPS base URL and exact same-origin history URL (https://raminhashemi1.github.io/sahamban/…) so existing WebMessage origin/path checks remain unchanged. Resolve only allowlisted same-origin bundle paths from APK assets using a narrow request interceptor. Block all other network requests, redirects, external hosts, non-HTTPS schemes and unlisted paths. No wildcard origins or generic JS bridge.
4. **Fail closed on service-worker/network behavior.** Prevent external network access at WebView navigation/resource and service-worker request layers; never silently fall back to live public main. Either serve a deterministic local worker asset snapshot under the same synthetic origin or disable service-worker registration only in the acceptance harness and explicitly record that limitation. Verify no request escapes the allowlist. Do not alter production sw.js or public site.
5. **Keep test storage isolated.** Dedicated package identity must own a clean WebView profile containing only fabricated alert/watchlist/portfolio fixtures. Assert no real app package, Chrome, PWA storage, account, or user portfolio can be accessed. Do not clear or migrate any existing application/browser data.
6. **Round-trip using existing native SAF implementation.** In isolated PWA, invoke normal export UI with synthetic-only snapshot. Use Android ACTION_CREATE_DOCUMENT; user chooses a test destination. Require exact-byte post-write readback before showing saved. Then select that exact synthetic JSON via normal JSON file input, inspect preview, and restore only within isolated acceptance package after separate explicit confirmation. Verify resulting synthetic UI/storage against fixture. Include cancel, timeout, rejected URI/provider and failed-readback negative paths without false PASS. Never select a personal file.
7. **Physical and CI evidence are separate.** CI verifies asset-manifest integrity, variant/package identity, manifest permissions, origin/path policy, network deny-by-default behavior, and Java/JS regressions. Physical acceptance records Android version, System WebView package/version, APK SHA-256, exact asset-source SHA, synthetic filename, export/readback outcome, import-preview outcome, consent outcome, resulting synthetic state, and cancel/error observations. No screenshots containing personal data.
8. **Release remains blocked.** A passing isolated harness proves only the pinned synthetic PWA↔Android flow. It does not approve merge, public Pages deployment, release signing, app-store publication, live user restore, financial source attestation, trades, payments or portfolio changes.

## Acceptance checklist
- [ ] Owner explicitly approves implementation of this debug-only isolated harness.
- [ ] Dedicated application ID is demonstrably separate; existing packages remain untouched.
- [ ] All PWA assets match the pinned feta commit and generated SHA-256 manifest.
- [ ] Exact origin/path remains unchanged; off-allowlist navigation/resource requests are blocked.
- [ ] Service-worker behavior is deterministic and no live public main resource is fetched.
- [ ] Isolated WebView storage contains only synthetic fixtures.
- [ ] Synthetic PWA export reaches SAF and exact-byte readback returns saved.
- [ ] Same file is selected and previewed; restore affects only isolated synthetic storage after explicit consent.
- [ ] Cancel/reject/timeout/readback-failure paths fail closed and never claim success.
- [ ] Exact-SHA CI and physical evidence are recorded separately.

## Current status and next action
ISOLATED_REAL_PWA_ACCEPTANCE_DESIGN=PROPOSED_NOT_APPROVED
REAL_PWA_BACKUP_UNVERIFIED
PHYSICAL_DEVICE_FULL_ACCEPTANCE_UNVERIFIED
MARKET_RELEASE_BLOCKED

**Single next action:** owner reviews and explicitly approves or declines this design. Until approval, do not implement the harness, build/install an APK, request a new device test, change origin policy, deploy, merge, or access live user storage. Existing PR #166 remains Draft/open and Issue #167 remains open. Original five-day plan and all financial fail-closed gates remain unchanged.


## 2026-11-13 — owner approval and implemented debug-only acceptance variant (supersedes proposal status)
- Owner explicitly approved implementation **only on `feta` with synthetic data**, and reiterated no Merge or Deploy. Design stage `PROPOSED_NOT_APPROVED` above is historical and is **superseded** by this entry; it is not a physical-test or publication approval.
- New Gradle build type `acceptance` (inherits debug; independent package `ir.sahamban.pilot.acceptance`) and new acceptance-only launcher `IsolatedAcceptanceActivity`. The normal public-network `MainActivity` is disabled in this build's manifest; existing `.restore` debug and production source/assets are not replaced. No user Chrome/PWA/WebView storage migration or cleanup.
- `prepareAcceptanceAssets` packages only root-level allowlisted public PWA file extensions from the single checked-out `feta` commit, with per-file SHA-256, length, MIME and 40-hex `sourceCommit` manifest. A dedicated CI workflow checks that the packaged APK matches that manifest and package/launcher, while prohibiting extra sensitive Android permissions. This is not a release-signing step.
- The acceptance Activity loads the bundled full `index.html` at the exact existing HTTPS base/history URL, serves only same-origin simple top-level allowlisted assets from APK using `shouldInterceptRequest`, blocks all off-allowlist/missing resources with HTTP 403, uses `setBlockNetworkLoads(true)` and prevents file:// and mixed HTTP. Service worker requests are intentionally denied in the acceptance profile and recorded **OUT_OF_SCOPE_FOR_THIS_HARNESS**; offline SW installation/update is NOT accepted by this test. The production origin allowlist in `TrustedNavigation` / `BackupExportPolicy` / `BackupExportBridge` was **not widened**.
- Debug-only synthetic gate: Activity seeds a **fabricated** alert entry into its own localStorage. `BackupExportBridge(this, view, true)` checks export payload has exactly one `sahamban-v1` item with the exact fabricated symbol/alert values; all other JSON keys/holdings are rejected. Import picker returns a URI to WebView **only after** a bounded read of the user-selected `content://` file, validation by the identical strict synthetic snapshot policy and transient permission check. Existing public/normal pilot constructor retains its previous semantics. A synthetically-valid file can still be written to/selected from user-chosen Android Documents; user must choose a dedicated test directory and never use personal files.
- New `tests/android-isolated-acceptance.test.cjs` plus smoke workflow wiring guard package isolation, no network fallback, exact origin, manifest and no release. Earlier CI at `4f5b7c936c69d46a1f526ad84f684bc2f74374aa` reported one Smoke failure from a **stale test assertion** referencing the former bridge constructor; corrected in `a72def438b19f296ebf0987bd71575a65c89172e` and its latest Smoke job subsequently completed successfully. Do not erase that historical failure.
- Verified build+APK static audit on exact SHA `ead64fe4b222b39a6822a2c46a0a760bc23e6aaa`: [acceptance workflow #43465347940](https://github.com/Raminhashemi1/sahamban/actions/runs/43465347940) **SUCCESS**, including compilation and package/launcher/asset-source hash audit. [Debug artifact #14057004664](https://github.com/Raminhashemi1/sahamban/actions/runs/43465347940/artifacts/14057004664) is ephemeral, **TEST ONLY**, not store ready. Further test/docs SHAs need their own exact-head checks; neither a CI PASS nor the earlier user's public-PWA screenshot is a physical round-trip acceptance of this new isolated APK.
- **Current gates**: `ISOLATED_ACCEPTANCE_IMPLEMENTED_BUILD_VERIFIED`, `ISOLATED_ACCEPTANCE_PHYSICAL_RESULT=UNVERIFIED`, `SERVICE_WORKER_ACCEPTANCE=NOT_TESTED_IN_HARNESS`, `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`. PR #166 remains Draft, Issue #167 remains OPEN; all day3 financial flags remain false and the original five-day program is unchanged. No merge, public Pages deploy, APK installation, store release, signing key change, personal file read/upload, holdings/orders/payment/trade or production state changes.
- **Single next gate:** obtain separate owner approval for installing/running the **isolated acceptance APK** on the real Samsung with synthetic-only file and isolated test folder. If approved, verify basic PWA UI and export/import *within the separate package*; record device model/Android/WebView versions and PASS/FAIL without any actual portfolio file. Do not remove older pilots or clear browser data. Until this physical step, do not claim end-to-end acceptance.
