# Android isolated acceptance checkpoint — 2026-11-14

## Scope and safety
- Work remains on `test/native-saf-pwa-visible-20261114` in draft PR #178.
- No merge, deploy, release, installation, transaction, or asset mutation was performed.
- The acceptance APK is synthetic-only and explicitly NOT FOR RELEASE.

## Verified head before this checkpoint
- Commit: `8eea4ef6b13531f10372e78fa270325045163811`
- All 13 GitHub checks completed successfully, including `acceptance-apk`.
- Acceptance job: https://github.com/Raminhashemi1/sahamban/actions/runs/43584981454
- Artifact: `sahamban-SYNTHETIC-isolated-acceptance-APK-NOT-FOR-RELEASE`
- Artifact ID: `14110271111`
- APK package: `ir.sahamban.pilot.acceptancefix2`
- versionCode: `9`
- versionName: `0.3.6-pilot`
- APK SHA-256: `32a546d3a36648f9d331ff34fa340eacecde6122729629b3d323cab5d2fe6cb9`
- CI verified the packaged PWA asset SHA-256 values against the generated manifest and audited the APK permissions.

## Changes in this continuation
- Kept the legacy export button present but hidden so existing event-binding code does not throw.
- Kept the synthetic-only SAF action as the sole visible export action.
- Updated the Android acceptance test to assert the hidden compatibility hook.
- Added pull-request path triggers to the isolated Android acceptance workflow.

## Next continuation point
1. Re-check PR #178 head and all checks after this checkpoint commit.
2. Keep PR #178 in Draft; do not merge.
3. If the user wants to test the APK, provide the isolated acceptance artifact with the synthetic-only warning and verify on-device behavior before any release-track work.
4. Continue the existing five-day plan without changing its sequence.

## Follow-up — exercise the real PWA backup UI with synthetic-only SAF guard

- Removed the acceptance-only early return that prevented the real local-backup PWA button from running inside the isolated acceptance WebView.
- The normal local-backup UI button is now the visible action; the separate synthetic shortcut is hidden. The acceptance activity still seeds only the exact synthetic alert record, and BackupExportBridge(..., true) rejects any non-synthetic document, unexpected key, or real portfolio payload before opening SAF.
- The existing PWA createSnapshot and saveDocument path is now used. Restore continues through the PWA's actual JSON file input, validation/preview, explicit consent, and rollback-capable restore code; the acceptance Activity pre-validates the selected document as the exact synthetic fixture before granting the single content:// URI.
- Bumped local-backup-v148.js cache query from 148.1 to 148.2 in HTML and service-worker core so a deployed PWA cannot keep executing the old handler.
- Added/updated tests to assert the visible real PWA control and that it sends only the seeded synthetic record through the native client. The acceptance workflow's JS tests and pure-Java policy tests passed.
- Exact branch HEAD: 7fc35c69e923d6ec2716663528b5337db7f0a692. Android acceptance build/audit succeeded in [workflow #43586928318](https://github.com/Raminhashemi1/sahamban/actions/runs/43586928318); artifact [14110518869](https://github.com/Raminhashemi1/sahamban/actions/runs/43586928318/artifacts/14110518869), package ir.sahamban.pilot.acceptancefix2, version 0.3.6-pilot, APK SHA-256 88d6573053a61f3c3a14d43e8f6d637d13c1d4f07ecf5e7048d31d045e280df5.
- This remains a synthetic-only isolated build, NOT FOR RELEASE. CI build and mocked JavaScript tests are not a physical device result. Actual Android SAF save/readback through the real PWA button and PWA restore on the physical device remain pending. Public main/Pages was not changed; no merge, deployment, release, or real user data access occurred.
