# Sahmino Android pilot wrapper — install test only

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
- WebView file imports use Android's system file picker. Local backup export
  uses AndroidX `WebMessageListener`, restricted to the exact HTTPS GitHub Pages
  origin and main frame, then Android's `ACTION_CREATE_DOCUMENT` picker. The
  native handler accepts only the known backup filename/schema, allowlisted
  local-storage keys and a 256 KiB maximum; it exposes no general-purpose
  JavaScript interface and requests no broad storage permission. Browser Blob
  download remains the fallback outside the Android wrapper. CI validates the
  bridge, but physical-device export, save, cancellation and re-import are still
  required before real portfolios should rely on it.
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

GitHub Actions workflow `Sahmino Android pilot debug APK` uses Java 17,
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


## Product brand
The current product name shown to users is **سهمینو (Sahmino)**. Historical repository slug, source identifiers, storage keys and URL paths containing `sahamban` are compatibility identifiers and are intentionally retained unless a separate migration is designed and tested.


## Local backup export implementation — v150

The wrapper registers `sahambanNativeBackup` only when WebView supports `WEB_MESSAGE_LISTENER`. Native code independently validates the exact `https://raminhashemi1.github.io` origin, main-frame status and `/sahamban/` path. The request is limited to the fixed JSON filename, schema version 1, five approved storage keys and 256 KiB. The user chooses the destination through Android's Storage Access Framework. No backup bytes are uploaded to a server. The browser's Blob fallback remains available when the native listener is unavailable.

A successful CI build and synthetic bridge tests do not prove physical-device operation. Before release, test export, picker cancellation, saved-file presence, app restart, import and exact synthetic-data restoration on a real Android device.

## Acceptance matrix — run only on a physical Android device

Record the device model, Android version, Android System WebView/Chrome version, app version, date, and result for each row. Do not use the 19 real holdings for destructive import/restore tests; use a synthetic backup with a distinct marker and verify the original PWA remains installed and untouched.

| Area | Safe acceptance procedure | Pass evidence |
|---|---|---|
| Install / identity | Install the debug APK alongside the existing Chrome PWA; confirm the launcher label and package `ir.sahmino.app`. | App launches; existing PWA and its data remain present. |
| Trusted navigation | Open the app; follow one same-origin Sahmino link and one external HTTPS link. | Same-origin stays in WebView; external HTTPS opens browser; no unsafe scheme is executed. |
| RTL / scaling / accessibility | Inspect Persian layout, increase Android display/font size, enable TalkBack and navigate controls. | No clipped critical controls; labels and focus order are usable. |
| Cold / warm start | Launch, background/resume, force-stop and relaunch. | App returns to the expected page without data loss or crash. |
| Import (synthetic only) | Use Android file picker to select a small synthetic CSV/JSON accepted by the PWA. | Picker returns the selected file and preview is correct; do not confirm any real portfolio replacement. |
| Export bridge | Export a synthetic local backup; save it, cancel a second picker request, then inspect the saved file. | Saved JSON exists, parses, uses the fixed filename/schema, and contains only synthetic data; cancellation does not report success. |
| Re-import (synthetic only) | In a disposable test state, import the saved synthetic JSON and verify exact values. | Exact synthetic values return; no real portfolio is used or replaced. |
| Offline / weak network | With only synthetic data loaded, open once online, enable airplane mode, cold-start and navigate cached views; restore network. | Cached shell and local synthetic data remain usable; network-dependent data is clearly unavailable rather than shown as fresh. |
| Update | Install a newer debug build over the pilot without clearing app data. | App updates in place and synthetic local state remains intact. |

Never clear WebView storage, uninstall the existing PWA, or run restore against a real portfolio during acceptance. A debug APK is for testing only and must not be distributed as a store release.
