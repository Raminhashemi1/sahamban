# Sahamban Android pilot wrapper — install test only

This module creates a **debug APK** containing a minimal Android WebView shell
for the existing public GitHub Pages PWA:
https://raminhashemi1.github.io/sahamban/

## Strict scope

- This is **not** a signed production release for Myket, Cafe Bazaar, or Google Play.
  The temporary release-base `ir.sahamban.pilot` ID and debug-only retest
  `ir.sahamban.pilot.retest` ID are not production identities. GitHub CI uses
  ephemeral debug signing certificates; none may become the final signing key.
- No checkout, Pro subscription, account registration or payments are added.
- This shell does **not** migrate browser Chrome/PWA localStorage or portfolio
  to WebView. Existing users MUST export their backup in the original PWA first,
  and carefully test an import with synthetic data. Do not uninstall the old
  PWA or wipe its data.
- WebView file imports use Android's system file picker. The main PWA WebView now enables `content://` reads only for the single JSON document explicitly selected by the user: the returned intent must carry `FLAG_GRANT_READ_URI_PERMISSION`, and a pure-Java policy rejects `file://`, network URLs, malformed or authority-less content URIs, and multi-selection. `file://` access remains disabled; no persistable URI grant is taken. For **supported Android System WebView**,
  the matching PWA code now requests a JSON export through an exact-origin, main-frame
  `WebViewCompat.addWebMessageListener` bridge. Android uses `ACTION_CREATE_DOCUMENT` so the
  user chooses the destination; filenames and size are allowlisted (256 KiB maximum),
  no storage permission or generic `addJavascriptInterface` is granted. The native
  bridge requests write-and-truncate (`wt`), closes the output, then opens the
  chosen SAF document for readback and compares every byte (including EOF).
  A provider that returns truncated, stale, unreadable or changed contents now
  fails closed instead of reporting a confirmed save. This is **not** an on-device
  PASS: saved JSON must still be located and restored with a synthetic portfolio.
  Unsupported WebViews fail closed instead of claiming a blob download succeeded.
  The web portfolio-backup import limit now shares the export client's 256 KiB byte cap,
  avoiding the former 30 KB import-only rejection for valid UTF-8 Persian JSON. The
  native request listener also has a five-minute fail-closed timeout and is removed
  on completion; a timeout never means the file was saved.
  **Important:** this debug APK loads the published `main` GitHub Pages PWA, not the `feta`
  branch. The companion `native-backup-export-v1.js` and updated HTML/worker must first be
  deployed together to the served site for end-to-end field testing; do not claim success
  merely from a green APK build.
- It relies on HTTPS to load the current public web app, not an embedded offline
  bundle. Service-worker/offline handling and slow networks require physical
  device validation. A narrowly origin-scoped WebMessage object is injected when
  supported; **no broad `addJavascriptInterface` bridge** or raw file access exists.
- Only HTTPS `raminhashemi1.github.io/sahamban/` navigation remains inside
  the app. Other HTTPS links go to an external browser; non-HTTPS and
  special-scheme navigation is blocked.
- Internet is the only declared Android permission; WebView `file://` access and cleartext HTTP remain disabled; automatic Android backup of app data is disabled. WebView `content://` access is enabled only because the PWA's JSON file input must read a document explicitly selected through Android `ACTION_OPEN_DOCUMENT`. The picker requests `application/json` plus a transient read grant; the Activity passes at most one URI, requires the returned read-grant flag, and accepts only a non-empty-authority `content://` URI. No persistent URI grant or broad JavaScript file bridge is added.
- A user-approved package ID, actual release signing key handled only in a
  secure owner-controlled build environment, genuine asset/icon and screenshots,
  store policy compliance, private data handling, and physical Android
  acceptance are still prerequisites for release.

## How to build a test APK

GitHub Actions workflow `Sahamban Android pilot debug APK` uses Java 17,
Android SDK 35, Gradle 8.11.1 and Android Gradle Plugin 8.9.2 to build
`app-debug.apk` in CI. It uploads a **debug artifact**, not a marketplace
release. No key files or signing passwords are stored in the repository.

For local development with an installed Android SDK:

```sh
gradle -p android-pilot :app:assembleDebug
```

Run pure Java navigation checks:

```sh
mkdir -p /tmp/sahamban-java-tests
javac -d /tmp/sahamban-java-tests   android-pilot/app/src/main/java/ir/sahamban/pilot/TrustedNavigation.java   android-pilot/tests/TrustedNavigationTest.java
java -cp /tmp/sahamban-java-tests ir.sahamban.pilot.TrustedNavigationTest
```

## Debug-only offline backup self-test (v0.3.4-pilot)

The **debug APK now has a second launcher** named «سهام‌بان - آزمون پشتیبان ساختگی (نصب مستقل)».
This test activity is **not present in release builds**. The main app launcher
still opens the published public PWA. The second launcher uses bundled synthetic
HTML via `loadDataWithBaseURL()` on the exact allowed HTTPS origin/path; it
blocks network requests, disables DOM storage, and does not read PWA holdings,
accounts or settings. The debug-only WebView permits content:// reads solely to
support the Android file chooser after the user explicitly chooses a JSON file;
it continues to prohibit file:// access, network loads and navigation. The
picker grants transient read access and rejects non-content:// / multi-file
results. No server, authentication, checkout or broker data is used.

To test on a real Android device without modifying GitHub Pages:

1. Install the [verified 0.3.4 debug APK artifact](https://github.com/Raminhashemi1/sahamban/actions/runs/43374677852/artifacts/14013104846)
   on the phone after extracting `app-debug.apk` from the downloaded ZIP.
   A prior device update to 0.3.3 failed to install (cause unknown; a mismatch
   between ephemeral CI debug signing keys is plausible). The 0.3.4 **debug
   variant only** has a new application ID `ir.sahamban.pilot.retest` via
   `applicationIdSuffix '.retest'`. It installs side by side with the previous
   `ir.sahamban.pilot`, so **do not uninstall** the older pilot, Chrome or PWA.
   No release ID/signing policy was changed.
2. Launch **«سهام‌بان - آزمون پشتیبان ساختگی»** (not the main app launcher).
3. Choose «ذخیره پشتیبان محلی ساختگی», confirm Android's Create Document picker,
   choose a directory and save the JSON.
4. Tap «انتخاب فایل JSON ذخیره‌شده», select the exact file just saved and inspect
   the resulting `PASS` or `FAIL`. The saved sample includes a fresh random
   nonce, so an older file from another attempt cannot pass.
5. Repeat for «ذخیره پشتیبان سبد ریسک ساختگی». Also try cancelling the picker,
   then selecting a stale JSON: this must **not** show PASS.
6. Repeat with the phone offline (airplane mode), since the fixture is bundled.
   Record date, device/Android/WebView versions and only PASS/FAIL outcomes;
   do **not** upload financial content or the JSON to GitHub.

This is a **native WebMessage + Android file picker + JSON readback diagnostic**
only; it is not a full integration test of live PWA storage, portfolio
import/export, or its JS asset versions. The real PWA still needs a coordinated
test deployment before declaring the complete backup feature accepted.

## Acceptance still required

Physical Android device: PWA loading, RTL, basic navigation, browser
handoff, permissions, synthetic 20/100-holding portfolio import and export,
offline/slow network, cold/warm start, and secure update behavior.
Record device/Android/WebView versions and actual results. Dedicated Persian
TalkBack/VoiceOver support and physical screen-reader acceptance are **out of
current pilot scope at owner direction**, untested, and only a possible future
update if requested. This does not attest accessibility or waive store/legal
requirements. Only afterwards choose a market-specific release wrapper/signing
approach.
Trusted Web Activity (TWA) additionally requires domain-root
`/.well-known/assetlinks.json` associated with the final **real** APK
signing certificate; a Project Pages path alone cannot satisfy it.

## 2026-11-13 — Owner scope decision: screen-reader support/testing moved to future backlog
- **Explicit owner decision (supersedes prior temporary skip):** dedicated **TalkBack/VoiceOver screen-reader support, Persian speech/reading-order assessment and related manual device testing** are **out of the CURRENT delivery scope**. Do not ask the owner to run them, schedule them as the next step, or spend development time on them now. Reconsider only if users request it or the owner chooses a future release. Keep this as an **unscheduled future option**, not a completed item.
- **Precise classification:** `SCREEN_READER_SCOPE=CURRENT_RELEASE_OUT_OF_SCOPE_BY_OWNER`, `TALKBACK_PHYSICAL_RESULT=NOT_TESTED`, `VOICEOVER_PHYSICAL_RESULT=NOT_TESTED`; neither an automated proxy nor this owner decision implies `PASS`, full WCAG compliance, or validated screen-reader access. Preserve all previous historical observations unmodified.
- **Do not delete functioning app functionality:** TalkBack/VoiceOver belong to Android/iOS, not a standalone Sahamban prediction feature. Existing labels, keyboard support, automated regression/axe checks and broad visual/mobile safeguards must remain intact to avoid unrelated regressions. This is removal of **current feature effort and active manual test tasks**, not a destructive code change.
- **Compliance caveat:** market submission, accessibility legal requirements and any specific store policy have not been independently assessed; this project must not falsely certify accessibility or imply that owner prioritization waives external obligations. Other deployment/payment/financial/recovery gates remain unchanged.
- **Live GitHub baseline before writing:** `feta` PR #166 OPEN/Draft/unmerged at `c1aa61674e226860d2eaf16ba93ea6b61ef6a89a`, with **10/12 checks successful, two in progress (`webkit-mobile`, `browser`)** and **9/11 matching-head workflows success** when inspected. Those checks belong to the pre-documentation SHA; verify the resulting new SHA separately.
- **Next non-accessibility work:** review-only preflight of the already-built **actual PWA ↔ Android WebMessage backup** path, which currently needs matching deployed web assets in a controlled environment. Do not reimplement the synthetic tests, overwrite the public PWA or deploy/merge without authorization. Issue #167 stays OPEN. `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`, PR #166 Draft. No orders, payments or real user files.

## 2026-11-13 — Fresh isolated restore-test APK identity (v0.3.5-pilot)

The next debug build uses package ID `ir.sahamban.pilot.restore` (`applicationIdSuffix '.restore'`) and versionCode 8 / versionName `0.3.5-pilot`. It installs side-by-side with the earlier `ir.sahamban.pilot.retest` debug app, so do not uninstall the older pilot, Chrome or installed PWA. This distinct debug identity also avoids depending on an ephemeral CI debug-signing key to update the prior test package.

This build includes the SAF import correction: the main PWA WebView can read only a single user-selected `content://` JSON URI with a returned transient read grant. Use synthetic JSON only. The published `main` PWA still does **not** load `native-backup-export-v1.js`; this APK can validate the PWA file-picker/import side but cannot establish the new native export path from the unmerged `feta` assets. Do not mistake a successful restore test for full PWA↔Android export/restore acceptance.

Physical import-only check (after the new artifact has a green Android build):
1. Install the new `ir.sahamban.pilot.restore` APK alongside older apps; do not uninstall or clear Chrome/PWA data.
2. Launch the normal «سهام‌بان» main launcher in this debug APK; it opens the currently published PWA in a fresh app-local WebView store.
3. In the PWA's local-backup import control, choose only a previously saved **synthetic** `test-offline-1.json` or another synthetic JSON fixture. Do not select any real portfolio export.
4. Confirm the preview lists only the expected synthetic keys, then explicitly confirm restore. Check the synthetic value appears; the app must reject non-JSON, multi-select and non-`content://` inputs.
5. Report only PASS/FAIL and Android/WebView version; never upload the JSON or financial content.

This verifies only the SAF file-selection/read/restore leg on a real WebView. It does not verify native export, live branch assets, persistence across app reinstall, or release readiness.
