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
- WebView file imports use Android's system file picker. For **supported Android System WebView**,
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
- Internet is the only declared Android permission; WebView file/content
  access and cleartext HTTP are explicitly disabled; automatic Android backup
  of app data is disabled.
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
offline/slow network, cold/warm start, font scaling, TalkBack, and secure
update behavior. Record device/Android/WebView versions and actual results.
Only afterwards choose a market-specific release wrapper/signing approach.
Trusted Web Activity (TWA) additionally requires domain-root
`/.well-known/assetlinks.json` associated with the final **real** APK
signing certificate; a Project Pages path alone cannot satisfy it.
