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
