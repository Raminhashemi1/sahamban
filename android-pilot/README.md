# Sahamban Android pilot wrapper — install test only

This module creates a **debug APK** containing a minimal Android WebView shell
for the existing public GitHub Pages PWA:
https://raminhashemi1.github.io/sahamban/

## Strict scope

- This is **not** a signed production release for Myket, Cafe Bazaar, or Google Play.
  The temporary `ir.sahamban.pilot` package ID and build-generated debug
  certificate must **not** become the final app identity/signing key.
- No checkout, Pro subscription, account registration or payments are added.
- This shell does **not** migrate browser Chrome/PWA localStorage or portfolio
  to WebView. Existing users MUST export their backup in the original PWA first,
  and carefully test an import with synthetic data. Do not uninstall the old
  PWA or wipe its data.
- WebView file imports use Android's system file picker. For **supported Android System WebView**,
  the matching PWA code now requests a JSON export through an exact-origin, main-frame
  `WebViewCompat.addWebMessageListener` bridge. Android uses `ACTION_CREATE_DOCUMENT` so the
  user chooses the destination; filenames and size are allowlisted (256 KiB maximum),
  no storage permission or generic `addJavascriptInterface` is granted. This is **not**
  an on-device PASS: saved JSON must be located and restored with a synthetic portfolio.
  Unsupported WebViews fail closed instead of claiming a blob download succeeded.
  **Important:** this debug APK loads the published `main` GitHub Pages PWA, not the `feta`
  branch. The companion `native-backup-export-v1.js` and updated HTML/worker must first be
  deployed together to the served site for end-to-end field testing; do not claim success
  merely from a green APK build.
- It relies on HTTPS to load the current public web app, not an embedded offline
  bundle. Service-worker/offline handling and slow networks require physical
  device validation. No injected native JavaScript interface is used.
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
