# Sahamban Android pilot wrapper — install test only

This module creates a **debug APK** containing a minimal Android WebView shell
for the existing public GitHub Pages PWA:
https://raminhashemi1.github.io/sahamban/

## Strict scope

- This is **not** a signed production release for Myket, Cafe Bazaar, or Google Play.
  The owner-approved permanent Android package ID is `ir.sahmino.app`;
  the build-generated debug certificate is temporary and must **not** become
  the production signing key.
- No checkout, Pro subscription, account registration or payments are added.
- This shell does **not** migrate browser Chrome/PWA localStorage or portfolio
  to WebView. Existing users MUST export their backup in the original PWA first,
  and carefully test an import with synthetic data. Do not uninstall the old
  PWA or wipe its data.
- WebView file imports use Android's system file picker. The consolidated local
  backup export now uses AndroidX `WebMessageListener` restricted to the exact
  GitHub Pages origin and main frame, then Android's `ACTION_CREATE_DOCUMENT`
  picker. The native handler accepts only the known backup filename/schema,
  allowlisted local-storage keys and a 256 KiB maximum; it does not expose a
  general-purpose JavaScript interface or request storage permissions. Other
  browser downloads still use the web Blob path. Physical-device export, save,
  cancellation and re-import must pass before this path is accepted for real data.
- It relies on HTTPS to load the current public web app, not an embedded offline
  bundle. Service-worker/offline handling and slow networks require physical
  device validation. No `addJavascriptInterface` or unrestricted JavaScript bridge is used.
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

## Acceptance still required

Physical Android device: PWA loading, RTL, basic navigation, browser
handoff, permissions, synthetic 20/100-holding portfolio import and export,
offline/slow network, cold/warm start, font scaling, TalkBack, and secure
update behavior. Record device/Android/WebView versions and actual results.
Only afterwards choose a market-specific release wrapper/signing approach.
Trusted Web Activity (TWA) additionally requires domain-root
`/.well-known/assetlinks.json` associated with the final **real** APK
signing certificate; a Project Pages path alone cannot satisfy it.


## Local backup export implementation — v149

The Android wrapper registers `sahambanNativeBackup` with AndroidX WebKit
`WebViewCompat.addWebMessageListener` only when the installed WebView supports
`WEB_MESSAGE_LISTENER`. The allowed origin is exactly
`https://raminhashemi1.github.io`; native code independently checks that the
message came from the main frame and that the active page path is under
`/sahamban/`. It accepts only `sahamban-local-backup-v1.json`, the
`sahamban-local-backup` schema version 1, the five allowlisted local storage
keys, JSON MIME type and at most 256 KiB. The user chooses the destination via
Android's Storage Access Framework; the app receives no broad filesystem
permission. No `addJavascriptInterface` API is used.

If the Android System WebView does not support the WebMessageListener feature,
the page retains its browser Blob-download fallback; that fallback is not
claimed as working on Android. A physical-device test must verify both the
native save-picker route and a complete export → app restart → file import →
restore cycle with synthetic data.


## Manual Android acceptance checklist (synthetic data only)

Run this only after the WebView bridge and matching PWA assets are available
together on the test deployment:

1. Record the device model, Android version and Android System WebView version.
2. Open the installed app and create two synthetic portfolio rows. Add one,
   edit its quantity/price, delete it with the two-step confirmation, and use
   Undo once. Save the final synthetic portfolio.
3. Export the consolidated local backup. Confirm Android's document picker
   opens, save the JSON under Downloads, and verify the file is present.
4. Force-stop and relaunch the app. Import that same JSON through the Android
   file picker, confirm restore, and verify the synthetic portfolio and local
   settings return exactly.
5. Import a synthetic CSV and a synthetic XLSX file. Confirm preview/validation
   is shown before the user commits imported rows.
6. Repeat export after cancelling the picker and confirm no portfolio data is
   lost or silently changed.
7. Record screenshots and the exact result of each step. Never use real broker
   credentials or real portfolio data for this acceptance run.

Passing browser automation or APK compilation does not replace this checklist.
