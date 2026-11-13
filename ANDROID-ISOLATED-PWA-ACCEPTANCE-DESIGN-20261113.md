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
